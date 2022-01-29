// https://github.com/s-r-x/bull-monitor/blob/main/packages/root/src/data-search.ts
import { Job, Queue } from 'bullmq';
import type { JobType } from 'bullmq';
import { getKeyCursorIterator } from './key-cursor-iterator';
import { getMultipleJobsById } from '../queues';

// todo: move to constants file
const MAX_EMPTY_ITERATIONS = 3;

type TSearchArgs = {
  status?: JobType;
  cursor?: string;
  search: string;
  count?: number;
  scanCount?: number;
};

export interface TSearchResult {
  nextCursor: string;
  jobs: Job[];
}

export class JobSearcher {
  constructor(private _queue: Queue) {}

  async search(args: TSearchArgs): Promise<TSearchResult> {
    let cursor = args.cursor || '0';

    const it = getKeyCursorIterator(this._queue, {
      cursor,
      status: args.status,
      filter: args.search,
      scanCount: args.scanCount,
    });

    const acc: string[] = [];
    let emptyIterations = 0;
    const count = Math.max(args.count ?? 10, args.scanCount ?? 10);

    for await (const ids of it.generator()) {
      cursor = it.cursor;
      if (ids.length === 0) {
        emptyIterations++;
        if (emptyIterations > MAX_EMPTY_ITERATIONS) {
          break;
        }
      }
      acc.push(...ids);
      if (acc.length >= count) {
        break;
      }
    }
    const jobs = await getMultipleJobsById(this._queue, acc);
    return { nextCursor: cursor, jobs };
  }
}
