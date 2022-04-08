import {
  isEmpty,
  isObject,
  isValidJobIdPattern,
  parse as parseExpression,
  safeParse,
  splitArray,
} from '@alpen/shared';
import boom, { badData, badRequest, notFound } from '@hapi/boom';
import { Job, Queue } from 'bullmq';
import LRUCache from 'lru-cache';
import ms from 'ms';
import { getJobFiltersKey } from '../keys';
import { getUniqueId, nanoid } from '../lib';
import { getConfigNumeric } from '../lib/config-utils';
import { compileExpression, ExpressionMeta } from '../lib/expr-utils';
import { checkMultiErrors } from '../redis';
import type { FilteredJobIdsResult, Maybe } from '../types';
import type { FilteredJobsResult, JobFilter, JobSearchStatus, } from '../types/queues';
import { createExpressionFilter, FilterFn, getIdCursorIterator } from './key-cursor-iterator';
import { getJobCountByType, getMultipleJobsById } from './queue';

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

function strEq(a: string, b: string): boolean {
  return (a === b) || ((a ?? '') === (b ?? ''));
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
    strEq(oldFilter.expression, filter.expression) &&
    strEq(oldFilter.pattern, filter.pattern)
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

  return findJobsByFilter(queue, {
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

const CursorExpiration = ms('30 mins');

interface SearchCursorMeta {
  cursor: string;
  timestamp: number;
  filter: string;
  total: number;
  count?: number;
  current: number;
  ids: string[];
  filteredIds: string[];
  exhausted: boolean;
  status: Maybe<JobSearchStatus>;
  pattern?: string;
}

// maxBatchCount to avoid blocking redis
const MAX_BATCH_COUNT = getConfigNumeric('JOB_MATCH_BATCH_SIZE', 200);
const MAX_EMPTY_ITERATIONS = getConfigNumeric('FILTER_MAX_EMPTY_ITERATIONS', 4);

export interface FindJobsByFilterOptions {
  filter?: string;
  cursor?: string;
  status?: JobSearchStatus;
  pattern?: string;
  count?: number;
}

export async function findJobIdsByFilter(
  queue: Queue,
  options: FindJobsByFilterOptions,
): Promise<FilteredJobIdsResult> {
  const client = await queue.client;
  let cursorKey: string;
  let meta: SearchCursorMeta;

  let cursor = options.cursor;
  let filter = options.filter;
  let pattern = options.pattern;
  let status = options.status;
  let count = options.count ?? 20;

  if (!cursor) {
    if (isEmpty(filter) && isEmpty(pattern)) {
      throw badRequest('Either a filter or pattern (or both) must ' +
        'be specified if no cursor is given');
    }
    validateJobIdPattern(pattern);
    cursor = nanoid();
    meta = {
      filter,
      status,
      cursor: '',
      current: 0,
      total: 0,
      count,
      ids: [],
      filteredIds: [],
      pattern,
      exhausted: false,
      timestamp: Date.now(),
    };
    if (status) {
      meta.total = await getJobCountByType(queue, status);
    } else {
      meta.total = await getJobCountByType(queue);
    }
    cursorKey = getCursorKey(queue, cursor);
  } else {
    cursorKey = getCursorKey(queue, cursor);
    const cursorStr = await client.get(cursorKey);
    meta = safeParse(cursorStr) as SearchCursorMeta;
    if (!isObject(meta)) {
      // invalid or expired cursor
      throw badRequest(`Invalid or expired cursor "${cursor}"`);
    }

    filter = meta.filter;
    pattern = meta.pattern;
    status = meta.status;
    count = meta.count ?? 20;
  }

  const filterFn = createExpressionFilter(queue, filter);

  let done = false;
  const acc: string[] = [];

  meta.ids = await filterIds(queue, meta.ids, acc, meta, count, filterFn);
  if (!meta.ids.length && !meta.filteredIds.length) {
    if (meta.exhausted) {
      meta.cursor = null;
      done = true;
    }
  }

  if (acc.length < count && !meta.exhausted && !done) {
    let emptyIterations = 0;

    // Note that we don't pass filter here, since we may have ids from the
    // current iterations push into the next, in which case the condition may
    // be stale, or the user decides to abort before the full set is exhausted.
    const it = getIdCursorIterator(queue, {
      cursor: meta.cursor,
      status,
      pattern,
    });

    for await (const ids of it.generator()) {
      meta.cursor = it.cursor;
      meta.current += ids.length;

      if (ids.length === 0 && meta.cursor) {
        emptyIterations++;
        if (emptyIterations > MAX_EMPTY_ITERATIONS) {
          break;
        }
        continue;
      }

      meta.ids = await filterIds(queue, ids, acc, meta, count, filterFn);
      if (!meta.cursor) {
        meta.exhausted = true;
        done = meta.ids.length === 0 && meta.filteredIds.length === 0;
        break;
      }

      if (acc.length >= count) {
        break;
      }
    }
  }

  if (!done) {
    meta.timestamp = Date.now();
    await client.setex(
      cursorKey,
      CursorExpiration / 1000,
      JSON.stringify(meta),
    );
  } else {
    cursor = null;
  }

  return {
    cursor,
    ids: acc,
    total: meta.total,
    current: meta.current,
  };
}

export async function findJobsByFilter(
  queue: Queue,
  options: FindJobsByFilterOptions,
): Promise<FilteredJobsResult> {
  const idsResult = await findJobIdsByFilter(queue, options);
  const jobs: Job[] = await getMultipleJobsById(queue, idsResult.ids);

  const { total, current, cursor: _cursor } = idsResult;
  return {
    cursor: _cursor,
    jobs,
    total,
    current,
  };
}

/**
 * Delete jobs by filter.
 *
 * @param queue
 * @param opts - contains number to limit how many jobs will be moved to wait status per iteration,
 * state (failed, completed) failed by default or from which timestamp.
 * @returns
 */
export async function removeJobsByFilter(
  queue: Queue,
  opts: {
    filter?: string;
    count?: number;
    status?: JobSearchStatus;
    pattern?: string;
  },
): Promise<number> {
  const client = await queue.client;
  const { filter, count = 10, status, pattern } = opts;

  // ensure that we have a filter of some sort,
  // otherwise we may end up nuking all jobs
  if (!filter?.length && !status && !pattern?.length) {
    throw badRequest('Either filter, status or pattern must be specified');
  }

  validateJobIdPattern(pattern);

  const iter = getIdCursorIterator(queue, {
    filter,
    status,
    pattern,
    scanCount: Math.min(count || 25, 10)
  });

  let pipeline = client.pipeline();
  let batchCount = 0;
  let deletedCount = 0;

  // flush batch
  async function flush(done = false) {
    const res = await pipeline.exec();
    res.forEach((r) => {
      if (!(r[0] instanceof Error)) {
        deletedCount += Number(r[1]);
      }
    });
    batchCount = 0;
    if (!done) {
      pipeline = client.pipeline();
    }
  }

  function pushId(jobId: string) {
    batchCount++;
    const keys = [jobId].map((name) => queue.toKey(name)).concat([jobId]);
    (pipeline as any).removeJob(keys);
  }

  for await(const ids of iter.generator()) {
    for (let i = 0; i < ids.length; i++) {
      pushId(ids[i]);
      if (batchCount > 25) {
        await flush(false);
      }
    }
  }

  if (batchCount) {
    await flush(true);
  }

  return deletedCount;
}

async function filterIds(
  queue: Queue,
  ids: string[],
  acc: string[],
  meta: SearchCursorMeta,
  count: number,
  filterFn: FilterFn,
) {
  function addFiltered(filtered: string[]) {
    const requested = count - acc.length;
    if (filtered.length > requested) {
      acc.push(...filtered.slice(0, requested));
      return filtered.slice(requested);
    } else {
      acc.push(...filtered);
      return [];
    }
  }

  if (acc.length < count) {
    if (meta.filteredIds.length) {
      meta.filteredIds = addFiltered(meta.filteredIds);
    }
    while (acc.length < count && ids.length) {
      const [slice, remainder] = splitArray(ids, count); // bump this up ?
      ids = remainder;
      const filtered = await filterFn(queue, slice);
      meta.filteredIds.push(...addFiltered(filtered));
    }
  }

  return ids;
}


/**
 * Delete jobs by pattern.
 *
 * @param queue
 * @param opts - contains number to limit how many jobs will be moved to wait status per iteration,
 * state (failed, completed) failed by default or from which timestamp.
 * @returns
 */
export async function removeJobsByPattern(
  queue: Queue,
  opts: {
    count?: number;
    status?: JobSearchStatus;
    pattern: string;
  },
): Promise<number> {
  return removeJobsByFilter(queue, opts);
}


export function validateJobIdPattern(pattern: string, required?: boolean): void {
  if (required && isEmpty(pattern)) {
    throw badRequest('A pattern must be specified');
  }
  if (!isValidJobIdPattern(pattern)) {
    throw boom.badRequest(`Invalid job id pattern: ${pattern}`);
  }
}
