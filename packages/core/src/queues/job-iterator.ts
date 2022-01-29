import { Queue, Job } from 'bullmq';
import type { JobJson, JobState } from 'bullmq';
import type { JobStatus } from '../types';
import { fixupJob, Scripts } from '../commands';

const DEFAULT_TEXT_SEARCH_SCAN_COUNT = 20;

type JobKey = keyof JobJson;

type TJobExcerpt = {
  id: string;
  job: Record<keyof JobJson, any> | Partial<Job>;
};

type TIteratorConfig = {
  scanCount?: number;
  keys?: JobKey[];
  jobName?: string;
  status?: JobState;
};

abstract class AbstractIterator {
  protected _scanCount: number;
  protected _keys: string[];
  protected _jobName: string;

  protected constructor(protected _queue: Queue, config: TIteratorConfig) {
    this._scanCount = config.scanCount || DEFAULT_TEXT_SEARCH_SCAN_COUNT;
    this._keys = config.keys && config.keys.length ? config.keys : ['data'];
    this._jobName = config.jobName;
  }

  abstract generator(): AsyncGenerator<TJobExcerpt[]>;
}

class SetIterator extends AbstractIterator {
  protected _status: JobStatus;
  protected _cursor = 0;
  protected _total = 0;

  constructor(queue: Queue, status: JobStatus, config: TIteratorConfig) {
    super(queue, config);
    this._status = status;
  }

  get total(): number {
    return this._total;
  }

  get cursor(): number {
    return this._cursor;
  }

  async *generator() {
    this._cursor = 0;

    const scan = async (): Promise<TJobExcerpt[]> => {
      const { cursor, jobs, total } = await Scripts.scanJobs(
        this._queue,
        this._status,
        this._jobName,
        this._keys,
        this._cursor,
        this._scanCount,
      );

      this._cursor = cursor;
      this._total = total;
      return jobs.map((job) => ({ id: job.id, job }));
    };

    do {
      const jobs = await scan();
      yield jobs;
    } while (this._cursor);
  }
}

class ListIterator extends AbstractIterator {
  private _ids: string[];
  private _cursor = 0;
  private _requestedJobName = false;
  constructor(queue: Queue, private _key: string, config: TIteratorConfig) {
    super(queue, config);
    this._requestedJobName = this._keys.includes('jobName');
  }

  protected async _extractJobsData(ids: string[]): Promise<TJobExcerpt[]> {
    const shouldFilter = this._jobName && this._jobName.length;
    const keys: string[] =
      !this._requestedJobName && shouldFilter
        ? [...this._keys, 'jobName']
        : this._keys;

    const client = await this._queue.client;
    const pipeline = client.pipeline();
    ids.forEach((id) => pipeline.hmget(this._queue.toKey(id), ...keys));
    const data = await pipeline.exec();
    return data.reduce((acc, [error, fields], idx) => {
      if (!error && fields && fields.length) {
        const job = Object.create(null);
        this._keys.forEach((key, index) => (job[key] = fields[index]));
        if (!shouldFilter || job.jobName === this._jobName) {
          if (!this._requestedJobName) {
            delete job.jobName;
          }
          const j = fixupJob(this._queue, job);
          // todo: fixup
          acc.push({
            job: j,
            id: ids[idx],
          });
        }
      }
      return acc;
    }, [] as TJobExcerpt[]);
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

  private _incCursor(n: number) {
    this._cursor += n;
  }
  private get _nextChunk() {
    return this._ids.slice(this._cursor, this._cursor + this._scanCount);
  }
}

export function getIterator(
  queue: Queue,
  status: JobStatus,
  keys: JobKey[] = ['data'],
  scanCount = DEFAULT_TEXT_SEARCH_SCAN_COUNT,
  jobName?: string,
): SetIterator | ListIterator {
  const redisKey = queue.toKey(status);
  const config: TIteratorConfig = { scanCount, keys, jobName };
  switch (status) {
    case 'completed':
    case 'failed':
    case 'delayed':
      return new SetIterator(queue, status, config);
    case 'active':
    case 'waiting':
    case 'paused':
      return new ListIterator(queue, redisKey, config);
  }
}
