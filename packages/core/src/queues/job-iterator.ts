import { Queue } from 'bullmq';
import { get } from 'lodash';
import { Readable } from 'stream';
import { JobStatusEnum } from './types';
import { safeParse } from '@alpen/shared';

const DEFAULT_TEXT_SEARCH_SCAN_COUNT = 20;

type TSearchArgs = {
  status: JobStatusEnum;
  limit: number;
  offset: number;
  term: string;
  key?: string;
  jobNames?: [];
  scanCount?: number;
};

type TJobExcerpt = {
  id: string;
  job: Record<string, any>;
};

type TIteratorConfig = {
  scanCount?: number;
  keys?: string[];
};

abstract class AbstractIterator {
  protected _scanCount: number;
  protected _keys: string[];
  protected constructor(protected _queue: Queue, config: TIteratorConfig) {
    this._scanCount = config.scanCount || DEFAULT_TEXT_SEARCH_SCAN_COUNT;
    this._keys = config.keys && config.keys.length ? config.keys : ['data'];
  }
  protected async _extractJobsData(ids: string[]): Promise<TJobExcerpt[]> {
    const client = await this._queue.client;
    const pipeline = client.pipeline();
    ids.forEach((id) => pipeline.hmget(this._queue.toKey(id), ...this._keys));
    const data = await pipeline.exec();
    return data.reduce((acc, [error, fields], idx) => {
      if (!error && fields && fields.length) {
        const job = Object.create(null);
        this._keys.forEach((key, index) => (job[key] = fields[index]));
        acc.push({
          job,
          id: ids[idx],
        });
      }
      return acc;
    }, [] as TJobExcerpt[]);
  }
  abstract generator(): AsyncGenerator<TJobExcerpt[]>;
  abstract destroy(): void;
}

class SetIterator extends AbstractIterator {
  private _stream: Readable;
  constructor(queue: Queue, private _key: string, config: TIteratorConfig) {
    super(queue, config);
  }
  async *generator() {
    const client = await this._queue.client;
    this._stream = client.zscanStream(this._key, {
      count: this._scanCount,
    });
    for await (const ids of this._stream) {
      this._stream.pause();
      const filteredIds = (ids as string[]).filter(
        (_k: string, idx) => !(idx % 2),
      );
      const data = await this._extractJobsData(filteredIds);
      yield data;
      this._stream.resume();
    }
  }
  destroy() {
    if (this._stream) {
      this._stream.destroy();
    }
  }
}

class ListIterator extends AbstractIterator {
  private _ids: string[];
  private _cursor = 0;
  constructor(queue: Queue, private _key: string, config: TIteratorConfig) {
    super(queue, config);
  }
  async *generator() {
    const client = await this._queue.client;
    this._ids = await client.lrange(this._key, 0, -1);
    while (true) {
      try {
        const ids = this._nextChunk;
        if (ids?.length === 0) {
          return;
        }
        const data = await this._extractJobsData(ids);
        this._incCursor(data.length);
        yield data;
      } catch (e) {
        console.error(e);
        return;
      }
    }
  }
  // noop
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  destroy() {}
  private _incCursor(n: number) {
    this._cursor += n;
  }
  private get _nextChunk() {
    return this._ids.slice(this._cursor, this._cursor + this._scanCount);
  }
}

export function getIterator(
  queue: Queue,
  status: JobStatusEnum,
  keys = ['data'],
  scanCount = DEFAULT_TEXT_SEARCH_SCAN_COUNT,
): SetIterator | ListIterator {
  const redisKey = queue.toKey(status);
  const config: TIteratorConfig = { scanCount, keys };
  switch (status) {
    case JobStatusEnum.COMPLETED:
    case JobStatusEnum.FAILED:
    case JobStatusEnum.DELAYED:
      return new SetIterator(queue, redisKey, config);
    case JobStatusEnum.ACTIVE:
    case JobStatusEnum.WAITING:
    case JobStatusEnum.PAUSED:
      return new ListIterator(queue, redisKey, config);
  }
}

export class DataTextSearcher {
  constructor(private _queue: Queue) {}
  async search(args: TSearchArgs) {
    const it = this._getIterator(args);
    const start = args.offset;
    const end = args.limit + start;
    const acc: string[] = [];
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/label
    mainLoop: for await (const jobs of it.generator()) {
      for (const job of jobs) {
        const matched = this._matchData(job['data'], args.term, args.key);
        if (matched) {
          acc.push(job.id);
        }
        if (acc.length >= end) {
          break mainLoop;
        }
      }
    }
    it.destroy();
    return await Promise.all(
      acc.slice(start, end).map((id) => this._queue.getJob(id)),
    );
  }
  private _getIterator(args: TSearchArgs): AbstractIterator {
    return getIterator(this._queue, args.status, ['data'], args.scanCount);
  }
  private _matchData(data: string, term: string, key?: string) {
    if (key) {
      const parsedData = safeParse(data);
      if (typeof parsedData === 'object') {
        const value = String(get(parsedData, key));
        return value?.includes(term);
      }
    } else {
      return data.includes(term);
    }
  }
}
