// https://github.com/s-r-x/bull-monitor/blob/main/packages/root/src/data-search.ts
import { isEmpty, isObject, safeParse, splitArray } from '@alpen/shared';
import { badRequest } from '@hapi/boom';
import { Job, Queue } from 'bullmq';
import type { JobState } from 'bullmq';
import ms from 'ms';
import { getKeyType } from './filter-utils';
import { nanoid } from '../ids';
import { getConfigNumeric } from '../lib/config-utils';
import type { FilteredJobsResult, Maybe } from '../types';
import {
  createExpressionFilter,
  getKeyCursorIterator,
  FilterFn,
} from './key-cursor-iterator';
import { getJobCountByType, getMultipleJobsById } from '../queues';

// todo: move to constants file
const MAX_EMPTY_ITERATIONS = 4;

const FilterCursorPrefix = '$filter-cursor';

function getCursorKey(queue: Queue, cursor: string): string {
  return queue.toKey(`${FilterCursorPrefix}:${cursor}`);
}

const CursorExpiration = ms('30 mins');

interface SearchCursorMeta {
  cursor: number;
  timestamp: number;
  filter: string;
  total: number;
  current: number;
  ids: string[];
  filteredIds: string[];
  exhausted: boolean;
  status: Maybe<JobState>;
}

// maxBatchCount to avoid blocking redis
const MAX_BATCH_COUNT = getConfigNumeric('JOB_MATCH_BATCH_SIZE', 200);

export async function findJobs(
  queue: Queue,
  status: Maybe<JobState>,
  filter: string,
  cursor: string,
  count = 10,
): Promise<FilteredJobsResult> {
  const client = await queue.client;
  let key: string;
  let meta: SearchCursorMeta;

  if (!cursor) {
    if (isEmpty(filter)) {
      throw badRequest('A filter must be specified if no cursor is given');
    }
    const isList = getKeyType(status) === 'list';
    cursor = nanoid();
    meta = {
      filter,
      status,
      cursor: 0,
      current: 0,
      total: 0,
      ids: [],
      filteredIds: [],
      exhausted: isList,
      timestamp: Date.now(),
    };
    if (status) {
      if (isList) {
        const key = queue.toKey(status);
        meta.ids = await client.lrange(key, 0, -1);
        meta.total = meta.ids.length;
        meta.exhausted = true;
      } else {
        meta.total = await getJobCountByType(queue, status);
      }
    } else {
      meta.total = await getJobCountByType(queue);
    }
  } else {
    key = getCursorKey(queue, cursor);
    const cursorStr = await client.get(key);
    meta = safeParse(cursorStr) as SearchCursorMeta;
    if (!isObject(meta)) {
      // invalid or expired cursor
      throw badRequest(`Invalid or expired cursor "${cursor}"`);
    }
  }

  filter = filter || meta.filter;

  const filterFn = createExpressionFilter(queue, filter);

  let done = false;
  const acc: string[] = [];

  meta.ids = await filterIds(meta.ids, acc, meta, count, filterFn);
  if (!meta.ids.length && !meta.filteredIds.length) {
    if (meta.exhausted) {
      meta.cursor = 0;
      done = true;
    }
  }

  if (acc.length < count && !meta.exhausted && !done) {
    let emptyIterations = 0;

    const it = getKeyCursorIterator(queue, {
      cursor,
      status,
    });

    for await (const ids of it.generator()) {
      meta.cursor = parseInt(it.cursor);
      meta.current += ids.length;

      if (ids.length === 0 && meta.cursor) {
        emptyIterations++;
        if (emptyIterations > MAX_EMPTY_ITERATIONS) {
          break;
        }
        continue;
      }

      meta.ids = await filterIds(ids, acc, meta, count, filterFn);
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
    key = getCursorKey(queue, cursor);
    meta.timestamp = Date.now();
    await client.setex(key, CursorExpiration / 1000, JSON.stringify(meta));
  } else {
    cursor = null;
  }

  const jobs: Job[] = await getMultipleJobsById(queue, acc);

  return {
    cursor,
    jobs,
    total: meta.total,
    current: meta.current,
  };
}

async function filterIds(
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
    while(acc.length < count && ids.length) {
      const [slice, remainder] = splitArray(ids, count); // bump this up ?
      ids = remainder;
      const filtered = await filterFn(slice);
      meta.filteredIds.push(...addFiltered(filtered));
    }
  }

  return ids;
}
