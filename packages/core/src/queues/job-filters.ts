import {
  isEmpty,
  isObject,
  parse as parseExpression,
  safeParse,
  splitArray,
  uniq,
} from '@alpen/shared';
import { isValidJobIdPattern } from '@alpen/shared';
import boom, { badData, badRequest, notFound } from '@hapi/boom';
import { Job, Queue } from 'bullmq';
import LRUCache from 'lru-cache';
import ms from 'ms';
import { getJobFiltersKey } from '../keys';
import { getUniqueId, nanoid } from '../lib';
import { getConfigNumeric } from '../lib/config-utils';
import { compileExpression, ExpressionMeta } from '../lib/expr-utils';
import { checkMultiErrors } from '../redis';
import type {
  FilteredJobsResult,
  JobFilter,
  JobSearchStatus,
} from '../types/queues';
import { findJobsByFilter } from './job-search';
import { getMultipleJobsById } from './queue';

// cache to save expression parsing overhead
const filterCache = new LRUCache({
  max: 40,
  ttl: 60000,
});

function getCompiled(filter: string): ExpressionMeta {
  let filterMeta = filterCache.get(filter) as ExpressionMeta;
  if (!filterMeta) {
    filterMeta = compileExpression(filter);
    filterCache.set(filter, filterMeta);
  }
  return filterMeta;
}

function unserialize(data: string): JobFilter {
  const value = safeParse(data);
  if (!value || typeof value !== 'object') return null;
  return value as JobFilter;
}

function serialize(jobFilter: JobFilter): string {
  return JSON.stringify(jobFilter);
}

export function validateFilterExpression(expr: string): void {
  parseExpression(expr);
}

function validateFilter(filter: JobFilter) {
  if (!filter.id) {
    throw badData('A filter requires an id');
  }
  if (!filter.name) {
    throw badData('Missing filter name');
  }
  validateFilterExpression(filter.expression);
  validateJobIdPattern(filter.pattern);
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
  status: JobSearchStatus | null,
  expression: string,
  pattern?: string,
): Promise<JobFilter> {
  const filter: JobFilter = {
    id: getUniqueId(),
    name,
    status,
    expression,
    pattern,
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
    oldFilter.expression === filter.expression &&
    oldFilter.pattern === filter.pattern
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
  cursor: string,
  count?: number,
): Promise<FilteredJobsResult> {
  const filter = await getJobFilter(queue, id);
  if (!filter)
    throw notFound(
      `No job filter with id "${id}" found for queue "${queue.name}"`,
    );

  return processSearch(queue, {
    status: filter.status,
    filter: filter.expression,
    pattern: filter.pattern,
    cursor,
    count
  });
}

const FilterCursorPrefix = '$filter-cursor';

function getCursorKey(queue: Queue, cursor: string): string {
  return queue.toKey(`${FilterCursorPrefix}:${cursor}`);
}

const CursorExpiration = ms('10 mins');

interface SearchCursorMeta {
  cursor: string;
  timestamp: number;
  filter: string;
  total: number;
  current: number;
  ids: string[];
}

// maxBatchCount to avoid blocking redis
const MAX_BATCH_COUNT = getConfigNumeric('JOB_MATCH_BATCH_SIZE', 200);

export async function processSearch(
  queue: Queue,
  options: {
    status?: JobSearchStatus;
    filter: string;
    pattern?: string;
    cursor?: string;
    count?: number;
  }
): Promise<FilteredJobsResult> {
  let jobs: Job[] = [];
  const client = await queue.client;
  let key: string;
  let meta: SearchCursorMeta;
  let firstRun: boolean;
  const idSet = new Set<string>();

  const { status, filter: _filter, cursor: _cursor, pattern, count } = options;

  let cursor = _cursor;
  let filter = _filter;

  if (!cursor) {
    if (isEmpty(filter)) {
      throw badRequest('A filter must be specified if no cursor is given');
    }
    cursor = nanoid();
    meta = {
      filter,
      cursor: null,
      current: 0,
      total: 0,
      ids: [],
      timestamp: Date.now(),
    };
    firstRun = true;
  } else {
    key = getCursorKey(queue, cursor);
    const cursorStr = await client.get(key);
    meta = safeParse(cursorStr) as SearchCursorMeta;
    if (!isObject(meta)) {
      // invalid or expired cursor
      throw badRequest(`Invalid or expired cursor "${cursor}"`);
    }
    firstRun = false;
  }

  filter = filter || meta.filter;

  if (meta.ids?.length) {
    const [slice, remainder] = splitArray(meta.ids, count);
    const fromCache = await getMultipleJobsById(queue, slice);
    meta.ids = remainder;
    jobs.push(...fromCache);
  }

  if (jobs.length < count) {
    let requestCount = Math.min(count - jobs.length, MAX_BATCH_COUNT);
    let nullCount = 0;

    while ((firstRun || meta.cursor) && jobs.length < count) {
      const {
        cursor: nextCursor,
        jobs: _jobs = [],
        total,
      } = await findJobsByFilter(queue, {
        status,
        filter,
        cursor: meta.cursor,
        pattern,
        count,
      });

      meta.cursor = nextCursor;
      meta.total = total;
      meta.current += _jobs.length;

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

      // todo: if we get ids from stored list, we may have to check the updated status to
      // make sure its still a valid job
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
  // it's possible for an id to be returned more than once
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

export function validateJobIdPattern(pattern: string, required?: boolean): void {
  if (required && isEmpty(pattern)) {
    throw badRequest('A pattern must be specified');
  }
  if (!isValidJobIdPattern(pattern)) {
    throw boom.badRequest(`Invalid job id pattern: ${pattern}`);
  }
}
