import boom from '@hapi/boom';
import ms from 'ms';
import LRUCache from 'lru-cache';
import { getJobFiltersKey, getUniqueId, nanoid, safeParse } from '../lib';
import { Job, JobJsonRaw, Queue } from 'bullmq';
import { FilteredJobsResult, JobFilter, JobStatusEnum } from '../../types';
import { Scripts } from '../commands/scripts';
import { checkMultiErrors } from '../redis';
import { getMultipleJobsById } from './queue';
import {
  convertToRPN,
  parse as parseExpression,
  KeywordValueFn,
  RpnNode,
  ValueKeyword,
  ValueKeywordNode,
  LiteralNode,
} from '../lib/expressions';
import fnv from 'fnv-plus';
import { isEmpty, isObject, uniq } from 'lodash';
import { getConfigNumeric } from '@lib/config-utils';

type FilterMeta = {
  rpn: RpnNode[];
  filter: string;
  hash: string;
  preprocessor: () => RpnNode[];
};

// map filter expression to rpn
const filterCache = new LRUCache({
  max: 40,
  maxAge: 60000,
});

const KeywordValues: Record<ValueKeyword, KeywordValueFn> = {
  $NOW: () => Date.now(),
};

function getExpressionHash(expr: string): string {
  return fnv.hash(expr).hex();
}

function getCompiled(filter: string, hash?: string): RpnNode[] {
  hash = hash ?? getExpressionHash(filter);
  let filterMeta = filterCache.get(hash) as FilterMeta;
  if (!filterMeta) {
    const rpn = convertToRPN(filter);
    // search node list for keywords to replace at runtime
    const substitutions: Array<[number, KeywordValueFn]> = [];
    rpn.forEach((node, i) => {
      if (node.type === 'keyword') {
        const name = (node as ValueKeywordNode).name;
        substitutions.push([i, KeywordValues[name]]);
      }
    });
    let preprocessor: () => RpnNode[] = () => rpn;
    if (substitutions.length) {
      preprocessor = () => {
        const result = [...rpn];
        substitutions.forEach((substitution) => {
          const [index, fn] = substitution;
          result[index] = {
            type: 'literal',
            value: fn(),
          } as LiteralNode;
        });
        return result;
      };
    }
    filterMeta = {
      filter,
      hash,
      rpn,
      preprocessor,
    };
    filterCache.set(hash, filterMeta);
  }

  return filterMeta.preprocessor();
}

function unserialize(data: string): JobFilter {
  const value = safeParse(data);
  if (!value || typeof value !== 'object') return null;
  const filter = value as JobFilter;
  filter.hash = filter.hash || getExpressionHash(filter.expression);
  return filter;
}

function serialize(jobFilter: JobFilter): string {
  return JSON.stringify(jobFilter);
}

export function validateFilterExpression(expr: string): void {
  parseExpression(expr);
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
  expression: string,
): Promise<JobFilter> {
  const hash = fnv.hash(expression).hex();
  const filter: JobFilter = {
    id: getUniqueId(),
    name,
    status,
    expression,
    hash,
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
    oldFilter.hash === filter.hash
  ) {
    return false;
  }
  filter.hash = getExpressionHash(filter.expression);
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
  cursor: string,
  count?: number,
): Promise<FilteredJobsResult> {
  const filter = await getJobFilter(queue, id);
  if (!filter)
    throw boom.notFound(
      `No job filter with id "${id}" found for queue "${queue.name}"`,
    );

  return processSearch(
    queue,
    filter.status,
    filter.expression,
    filter.hash,
    cursor,
    count,
  );
}

const FilterCursorPrefix = '$filter-cursor';

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

const CursorExpiration = ms('10 mins');

interface SearchCursorMeta {
  cursor: number;
  timestamp: number;
  filter: string;
  hash: string;
  total: number;
  current: number;
  ids: string[];
}

// maxBatchCount to avoid blocking redis
const MAX_BATCH_COUNT = getConfigNumeric('JOB_MATCH_BATCH_SIZE', 200);

export async function processSearch(
  queue: Queue,
  status: JobStatusEnum,
  filter: string,
  hash: string = null,
  cursor: string,
  count = 10,
): Promise<FilteredJobsResult> {
  let jobs: Job[] = [];
  const client = await queue.client;
  let key: string;
  let meta: SearchCursorMeta;
  let firstRun: boolean;
  const idSet = new Set<string>();

  if (!cursor) {
    if (isEmpty(filter)) {
      throw boom.badRequest('A filter must be specified if no cursor is given');
    }
    cursor = nanoid();
    meta = {
      filter,
      cursor: 0,
      current: 0,
      total: 0,
      ids: [],
      timestamp: Date.now(),
      hash: getExpressionHash(filter),
    };
    firstRun = true;
  } else {
    key = getCursorKey(queue, cursor);
    const cursorStr = await client.get(key);
    meta = safeParse(cursorStr) as SearchCursorMeta;
    if (!isObject(meta)) {
      // invalid or expired cursor
      throw boom.badRequest(`Invalid or expired cursor "${cursor}"`);
    }
    firstRun = false;
  }

  filter = filter || meta.filter;
  hash = hash || meta.hash || getExpressionHash(filter);

  if (meta.ids?.length) {
    const [slice, remainder] = splitArray(meta.ids, count);
    const fromCache = await getMultipleJobsById(queue, slice);
    meta.ids = remainder;
    fromCache.forEach((json) => {
      const job = Job.fromJSON(queue, json as unknown as JobJsonRaw);
      jobs.push(job);
    });
  }

  if (jobs.length < count) {
    let requestCount = Math.min(count - jobs.length, MAX_BATCH_COUNT);
    let nullCount = 0;
    const compiled = getCompiled(filter, hash);
    while ((firstRun || meta.cursor) && jobs.length < count) {
      const {
        cursor: nextCursor,
        jobs: _jobs,
        count: iterCount,
        total,
      } = await Scripts.getJobsByFilter(
        queue,
        status,
        compiled,
        meta.cursor,
        requestCount,
      );

      meta.cursor = nextCursor;
      meta.total = total;
      meta.current += iterCount;

      if (!nextCursor) {
        break;
      }

      if (!_jobs.length) {
        nullCount++;
        if (nullCount >= 2) {
          nullCount = 0;
          requestCount = Math.max(requestCount * 2, MAX_BATCH_COUNT);
        }
        continue;
      } else {
        requestCount = Math.max(count, MAX_BATCH_COUNT);
      }

      const [slice, remainder] = splitArray(_jobs, count - jobs.length);
      jobs.push(...slice);
      if (remainder.length) {
        // store remainder to cursor
        meta.ids = uniq(remainder.map((job) => job.id));
        break;
      }
    }
  }

  if (meta.cursor) {
    key = getCursorKey(queue, cursor);
    meta.timestamp = Date.now();
    await client.setex(key, CursorExpiration / 1000, JSON.stringify(meta));
  } else {
    cursor = null;
  }

  const items: Job[] = [];
  // its possible for an id to be returned more than once
  jobs.forEach((job) => {
    if (!idSet.has(job.id)) {
      idSet.add(job.id);
      items.push(job);
      if (status) {
        // hackish
        (job as any).state = status;
      }
    }
  });
  jobs = items;

  return {
    cursor,
    jobs,
    total: meta.total,
    current: meta.current,
  };
}
