// https://github.com/s-r-x/bull-monitor/blob/main/packages/root/src/data-search.ts
import {
  ExprEval,
  isEmpty,
  safeParse,
  isObject,
} from '@alpen/shared';
import { collectExpressionIdentifiers } from '@alpen/shared';
import { errorObject, Queue, tryCatch } from 'bullmq';
import type { JobType, JobJson } from 'bullmq';
import { getMultipleJobsById } from '../queues';
import { logger } from '../logger';
import { getConfigNumeric } from '../lib/config-utils';
import { Readable } from 'stream';
import type { Maybe } from '../types';
import { JobProps } from './job';
import { createContext } from './filter-utils';

type ComputedFields = 'responseTime' | 'processTime' | 'waitTime' | 'runTime';

type JobKey = keyof JobJson;
const propSet = new Set<string>(JobProps);

type EvalFn = ReturnType<typeof ExprEval.compile>;

type TSearchArgs = {
  status: JobType;
  limit: number;
  offset: number;
  search: string;
  scanCount?: number;
};

export class DataSearcher {
  private fields: JobKey[] = ['data'];

  constructor(private _queue: Queue) {}

  private compile(expr: string): EvalFn {
    const ast = ExprEval.parse(expr);
    if (!ast) {
      throw new Error(`Invalid expression: ${expr}`);
    }
    const identifiers = new Set<string>();
    collectExpressionIdentifiers(ast, identifiers);
    this.fields = getFieldsToFetch(identifiers);
    return (ctx) => ExprEval.evaluate(ast, ctx);
  }

  async search(args: TSearchArgs) {
    let expr: EvalFn;
    try {
      expr = this.compile(args.search);
    } catch (_e) {
      return [];
    }
    const it = this._getIterator(args);
    if (!it) return [];
    const start = args.offset;
    const end = args.limit + start;
    const acc: string[] = [];
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/label
    mainLoop: for await (const jobs of it.generator()) {
      for (const job of jobs) {
        const matched = DataSearcher._matchData(job, expr);
        if (matched) {
          acc.push(job.id);
        }
        if (acc.length >= end) {
          break mainLoop;
        }
      }
    }
    it.destroy();
    const ids = acc.slice(start, end);
    return getMultipleJobsById(this._queue, ids);
  }
  private _getIterator(args: TSearchArgs): Maybe<AbstractIterator> {
    const redisKey = this._queue.toKey(args.status);
    const config: TIteratorConfig = {
      scanCount: args.scanCount,
      fields: this.fields,
    };
    switch (args.status) {
      case 'completed':
      case 'failed':
      case 'delayed':
        return new SetIterator(this._queue, redisKey, config);
      case 'active':
      case 'waiting':
      case 'paused':
        return new ListIterator(this._queue, redisKey, config);
    }
  }
  private static _matchData(data: JobJson, expr: EvalFn): boolean {
    const context = createContext(data);
    try {
      const result = !!expr(context);
      if (!result) return false;
      return typeof result === 'object' ? !isEmpty(result) : !!result;
    } catch (_e) {
      return false;
    }
  }
}

type TIteratorConfig = {
  scanCount?: number;
  fields?: JobKey[];
};

abstract class AbstractIterator {
  protected _scanCount: number;
  protected _fields: JobKey[];

  constructor(protected _queue: Queue, config: TIteratorConfig) {
    this._scanCount = config.scanCount || getScanCount();
    this._fields = config.fields || ['data'];
  }
  protected async _extractJobsData(ids: string[]): Promise<JobJson[]> {
    const client = await this._queue.client;
    const pipeline = client.pipeline();
    ids.forEach((id) => pipeline.hmget(this._queue.toKey(id), ...this._fields));
    const data = await pipeline.exec();

    return data.reduce((acc, [error, [jobData]], idx) => {
      if (!error && jobData && jobData !== '{}' && jobData !== '[]') {
        const job = hydrateJobJson(ids[idx], jobData);
        if (job) {
          acc.push(job);
        }
      }
      return acc;
    }, [] as JobJson[]);
  }
  abstract generator(): AsyncGenerator<JobJson[]>;
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
        if (!ids?.length) {
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

function hydrateJobJson(
  jobId: string,
  fromRedis: string | Record<string, unknown>,
): Maybe<JobJson> {
  const json = typeof fromRedis === 'string' ? safeParse(fromRedis) : fromRedis;
  if (!isObject(json)) {
    return null;
  }

  const name = json.name || '__default__';
  const timestamp = parseInt(json.timestamp ?? '0');

  const data = !json.data ? {} : JSON.parse(json.data);
  const opts = !json.data ? {} : JSON.parse(json.opts || '{}');

  const job: JobJson = {
    attemptsMade: 0,
    failedReason: '',
    progress: undefined,
    returnvalue: '',
    stacktrace: '',
    name,
    data,
    opts,
    timestamp,
    id: jobId,
  };

  job.progress = JSON.parse(json.progress || '0');

  if (json.finishedOn) {
    job.finishedOn = parseInt(json.finishedOn);
  }

  if (json.processedOn) {
    job.processedOn = parseInt(json.processedOn);
  }

  job.failedReason = json.failedReason;
  job.attemptsMade = parseInt(json.attemptsMade || '0');

  job.stacktrace = json.stacktrace;

  if (typeof json.returnvalue === 'string') {
    job.returnvalue = getReturnValue(json.returnvalue);
  }

  if (json.parentKey) {
    job.parentKey = json.parentKey;
  }

  // TODO:
  if (json.parent) {
    // job.parent = JSON.parse(json.parent);
  }

  job.parentKey = json.parentKey;

  return job;
}


function getScanCount(): number {
  return getConfigNumeric('DATA_SEARCH_SCAN_COUNT', 500);
}

const computedBaseFields: Record<ComputedFields, JobKey[]> = {
  responseTime: ['timestamp', 'finishedOn'],
  processTime: ['finishedOn', 'processedOn'],
  waitTime: ['timestamp', 'processedOn'],
  runTime: ['processedOn', 'finishedOn'],
};

function getFieldsToFetch(identifiers: Set<string>): JobKey[] {
  const fields = new Set<JobKey>();
  for (const [key, value] of Object.entries(computedBaseFields)) {
    if (identifiers.has(key)) {
      value.forEach((k) => fields.add(k));
    }
  }
  identifiers.forEach((key) => {
    if (propSet.has(key)) fields.add(key as JobKey);
  });
  return Array.from(fields);
}

function getTraces(stacktrace: string[]) {
  const traces = tryCatch(JSON.parse, JSON, [stacktrace]);
  if (traces === errorObject || !(traces instanceof Array)) {
    return [];
  } else {
    return traces;
  }
}

function getReturnValue(_value: any) {
  const value = tryCatch(JSON.parse, JSON, [_value]);
  if (value !== errorObject) {
    return value;
  } else {
    logger.warn('corrupted returnvalue: ' + _value, value);
  }
}
