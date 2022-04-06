// https://github.com/s-r-x/bull-monitor/blob/main/packages/root/src/data-search.ts
import { isEmpty, isObject, safeParse, splitArray } from '@alpen/shared';
import { badRequest } from '@hapi/boom';
import { Job, Queue } from 'bullmq';
import ms from 'ms';
import { nanoid } from '../ids';
import { getConfigNumeric } from '../lib/config-utils';
import type {
  FilteredJobsResult,
  Maybe,
  JobSearchStatus,
  FilteredJobIdsResult,
} from '../types';
import {
  createExpressionFilter,
  getIdCursorIterator,
  FilterFn,
} from './key-cursor-iterator';
import { getJobCountByType, getMultipleJobsById, validateJobIdPattern } from '../queues';

// todo: move to constants file
const MAX_EMPTY_ITERATIONS = 4;

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

export interface FindJobsByFilterOptions {
  filter: string;
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
