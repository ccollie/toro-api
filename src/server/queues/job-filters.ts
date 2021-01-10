import boom from '@hapi/boom';
import ms from 'ms';
import { getJobFiltersKey, getUniqueId, nanoid, safeParse } from '../lib';
import { Job, Queue } from 'bullmq';
import { JobFilter, JobStatusEnum } from '../../types';
import { accepts as isValid } from 'mongodb-language-model';
import { FilteredJobsResult, Scripts } from '../commands/scripts';
import { checkMultiErrors } from '../redis';
import { isObject, isEmpty } from 'lodash';

function unserialize(data: string): JobFilter {
  const value = safeParse(data);
  if (!value || typeof value !== 'object') return null;
  return value as JobFilter;
}

function serialize(jobFilter: JobFilter): string {
  return JSON.stringify(jobFilter);
}

const UnsupportedOperators = new Set<string>([
  '$box',
  '$comment',
  '$day',
  '$mergeObjects',
  '$maxDistance',
  '$minDistance',
  '$minute',
  '$millisecond',
  '$objectToArray',
  '$polygon',
  '$uniqueDocs',
  '$week',
  '$where',
  '$year',
]);

const InvalidPrefixes = [
  '$bit',
  '$day',
  '$geo',
  '$near',
  '$iso',
  '$set',
  '$std',
];

function isSupported(op: string): boolean {
  for (let i = 0; i < InvalidPrefixes.length; i++) {
    if (op.startsWith(InvalidPrefixes[i])) return false;
  }
  return !UnsupportedOperators.has(op);
}

export function validateFilterExpression(expr: Record<string, any>): void {
  // todo: substitute our special ops for standard ones
  // ($match, $startsWith, $endsWith and $toBoolEx)
  // convert dates to int, $numberlong etc to equivalents
  // also flag non-supported (i.e. geo, bit, date, etc)
  const asString = JSON.stringify(expr);
  if (!isValid(asString)) {
    throw boom.badData('Invalid query filter', expr);
  }
}

function validateFilter(filter: JobFilter) {
  if (!filter.id) {
    throw boom.badData('A filter requires an id');
  }
  if (!filter.name) {
    throw boom.badData('Missing filter name');
  }
  validateFilterExpression(filter.expression);
}

async function storeFilter(queue: Queue, filter: JobFilter): Promise<void> {
  const toStore = serialize(filter);
  const client = await queue.client;
  const key = getJobFiltersKey(queue);
  await client.hset(key, filter.id, toStore);
}

export async function addJobFilter(
  queue: Queue,
  name: string,
  status: JobStatusEnum | null,
  expression: Record<string, any>,
): Promise<JobFilter> {
  const filter: JobFilter = {
    id: getUniqueId(),
    name,
    status,
    expression,
    createdAt: Date.now(),
  };

  validateFilter(filter);
  await storeFilter(queue, filter);

  return filter;
}

export async function getJobFilter(
  queue: Queue,
  id: string,
): Promise<JobFilter> {
  const client = await queue.client;
  const key = getJobFiltersKey(queue);
  const value = await client.hget(key, id);
  return unserialize(value);
}

export async function updateJobFilter(
  queue: Queue,
  filter: JobFilter,
): Promise<boolean> {
  validateFilter(filter);
  const oldFilter = await getJobFilter(queue, filter.id);
  // see if we differ
  if (
    oldFilter &&
    oldFilter.name === filter.name &&
    oldFilter.status === filter.status &&
    oldFilter.expression === filter.expression
  ) {
    return false;
  }
  await storeFilter(queue, filter);
  return true;
}

export async function getJobFilters(
  queue: Queue,
  ids?: string[],
): Promise<JobFilter[]> {
  const client = await queue.client;
  const key = getJobFiltersKey(queue);
  let values: string[];
  const result: JobFilter[] = [];

  if (ids) {
    values = await client.hmget(key, ids);
  } else {
    const val = await client.hgetall(key);
    values = [];
    for (const id in val) {
      values.push(val[id]);
    }
  }

  values.forEach((value) => {
    const filter = unserialize(value);
    filter && result.push(filter);
  });

  return result;
}

export async function deleteJobFilter(
  queue: Queue,
  id: string,
): Promise<boolean> {
  const client = await queue.client;
  const key = getJobFiltersKey(queue);
  const deleted = await client.hdel(key, id);
  return !!deleted;
}

export async function deleteAllJobFilters(queue: Queue): Promise<number> {
  const client = await queue.client;
  const key = getJobFiltersKey(queue);
  const pipeline = client.multi();
  pipeline.hkeys(key);
  pipeline.del(key);
  const response = await pipeline.exec().then(checkMultiErrors);
  const items = response[0];
  const count = items ? items.length : 0;
  const deleted = !!response[1];
  return deleted ? count : 0;
}

export async function getJobsByFilterId(
  queue: Queue,
  id: string,
  cursor: number,
  count?: number,
): Promise<FilteredJobsResult> {
  const filter = await getJobFilter(queue, id);
  if (!filter)
    throw boom.notFound(
      `No job filter with id "${id}" found for queue "${queue.name}"`,
    );

  return Scripts.getJobsByFilter(
    queue,
    filter.status,
    filter.expression,
    cursor,
    count,
  );
}

const FilterCursorPrefix = 'FILTER_CURSOR';

function getCursorKey(queue: Queue, cursor: string): string {
  return queue.toKey(`${FilterCursorPrefix}:${cursor}`);
}

function splitArray<T = any>(source: T[], count: number): [T[], T[]] {
  const len = source.length;
  if (count >= len) {
    return [source, []];
  }
  const toTake = Math.max(len, count);
  const slice = source.slice(0, toTake - 1);
  const remainder = toTake < len ? source.slice(toTake) : [];
  return [slice, remainder];
}

const CursorExpiration = ms('5 mins');

interface SearchCursorMeta {
  cursor: number;
  timestamp: number;
  filter: Record<string, any>;
  jobData: Record<string, any>[];
}

async function processSearch(
  queue: Queue,
  status: JobStatusEnum,
  filter: Record<string, any>,
  cursor: string,
  count = 10,
): Promise<{ cursor: string; jobs: Job[] }> {
  const jobs: Job[] = [];
  const client = await queue.client;
  let key: string;
  let meta: SearchCursorMeta;

  if (!cursor) {
    if (isEmpty(filter)) {
      throw boom.badRequest('A filter must be specified if no cursor is given');
    }
    cursor = nanoid();
    meta = {
      filter,
      cursor: 0,
      jobData: [],
      timestamp: Date.now(),
    };
  } else {
    key = getCursorKey(queue, cursor);
    const cursorStr = await client.get(key);
    meta = safeParse(cursorStr) as SearchCursorMeta;
    if (!isObject(meta)) {
      // invalid or expired cursor
      throw boom.badRequest(`Invalid or expired cursor "${cursor}"`);
    }
  }

  filter = filter || meta.filter;

  count = count || 10;
  if (meta.jobData && meta.jobData.length) {
    const [slice, remainder] = splitArray(meta.jobData, count);
    meta.jobData = remainder;
    slice.forEach((json) => {
      const job = Job.fromJSON(queue, json);
      jobs.push(job);
    });
  }

  if (jobs.length < count) {
    let requestCount = count;
    let nullCount = 0;
    while (meta.cursor && jobs.length < count) {
      const { nextCursor, jobs: _jobs } = await Scripts.getJobsByFilter(
        queue,
        status,
        filter,
        meta.cursor,
        requestCount,
      );

      meta.cursor = nextCursor;

      if (!_jobs.length) {
        nullCount++;
        if (nullCount >= 2) {
          nullCount = 0;
          requestCount = Math.max(requestCount * 2, 500);
        }
        continue;
      }
      const [slice, remainder] = splitArray(_jobs, count - jobs.length);
      jobs.push(...slice);
      if (remainder.length) {
        // store remainder to cursor
        meta.jobData = remainder.map((job) => job.asJSON());
        break;
      }
    }
  }

  key = getCursorKey(queue, cursor);
  meta.timestamp = Date.now();
  client.setex(key, CursorExpiration / 1000, JSON.stringify(meta));

  return {
    cursor,
    jobs,
  };
}
