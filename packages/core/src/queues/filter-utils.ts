import {
  Expression,
  ExprEval,
  isEmpty,
  isNumber,
  isObject,
  safeParse,
} from '@alpen/shared';
import { array2obj, errorObject, JobState, Queue, tryCatch } from 'bullmq';
import type { JobJson } from 'bullmq';
import { logger } from '../logger';
import {
  calculateProcessTime,
  calculateResponseTime,
  calculateWaitTime,
  JobProps,
} from './job';
import type { Maybe } from '../types';

type ComputedFields = 'responseTime' | 'processTime' | 'waitTime' | 'runTime';

type JobKey = keyof JobJson;
const propSet = new Set<string>(JobProps);

export type ContextType = Parameters<typeof ExprEval.evaluate>[1];

function createMathFn(name) {
  const fn = (Math as any)[name];
  return function (val: unknown) {
    if (val === null || val === undefined) {
      return val;
    }
    if (typeof val !== 'number') {
      val = parseFloat(`${val}`);
    }
    return fn(val);
  };
}

// todo: absolutely need Math.max and Math.min
type MathFuncType = keyof Math;
const BaseMathFuncs: MathFuncType[] = [
  'abs',
  'ceil',
  'floor',
  'log',
  'round',
  'sign',
  'sqrt',
  'trunc',
];
// @ts-ignore
const MathFuncs: Record<MathFuncType, any> = { PI: Math.PI };

BaseMathFuncs.forEach((name) => {
  MathFuncs[name] = createMathFn(name);
});

const ObjectMethods = {
  keys: (obj: unknown): string[] => {
    return isObject(obj) ? Object.keys(obj) : [];
  },
  values: (obj: unknown): string[] => {
    return isObject(obj) ? Object.values(obj) : [];
  },
  entries: (obj: unknown) => {
    return isObject(obj) ? Object.entries(obj) : [];
  },
};

export function createContext(job: JobJson): ContextType {
  const context = {
    Math: MathFuncs,
    Object: ObjectMethods,
    ...job,
    get responseTime(): Maybe<number> {
      return calculateResponseTime(job);
    },
    get processTime(): Maybe<number> {
      return calculateProcessTime(job);
    },
    get waitTime(): Maybe<number> {
      return calculateWaitTime(job);
    },
    get runTime(): Maybe<number> {
      return isNumber(job.finishedOn) && isNumber(job.processedOn)
        ? job.finishedOn - job.processedOn
        : undefined;
    },
  };
  return context as unknown as ContextType;
}

export function hydrateJobJson(
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

export async function extractJobsData(
  queue: Queue,
  ids: string[],
  fields: JobKey[],
  ast?: Expression,
): Promise<JobJson[]> {
  if (ids.length === 0) return [];
  const client = await queue.client;
  const pipeline = client.pipeline();
  ids.forEach((id) => pipeline.hmget(queue.toKey(id), ...fields));
  const data = await pipeline.exec();

  return data.reduce((acc, [error, jobData], idx) => {
    if (!error && jobData && jobData !== '{}' && jobData !== '[]') {
      const rec = array2obj(jobData);
      const job = hydrateJobJson(ids[idx], rec);
      if (job && (!ast || matchData(ast, job))) {
        acc.push(job);
      }
    }
    return acc;
  }, [] as JobJson[]);
}

function matchData(ast: Expression, data: JobJson): boolean {
  if (isEmpty(data)) return false;
  const context = createContext(data);
  try {
    const result = ExprEval.evaluate(ast, context);
    if (!result) return false;
    return typeof result === 'object' ? !isEmpty(result) : !!result;
  } catch (_e) {
    return false;
  }
}

const computedBaseFields: Record<ComputedFields, JobKey[]> = {
  responseTime: ['timestamp', 'finishedOn'],
  processTime: ['finishedOn', 'processedOn'],
  waitTime: ['timestamp', 'processedOn'],
  runTime: ['processedOn', 'finishedOn'],
};

export function getFieldsToFetch(identifiers: Set<string>): JobKey[] {
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

export async function getListIds(queue: Queue, key: string): Promise<string[]> {
  const client = await queue.client;
  return client.lrange(key, 0, -1);
}

export function getKeyType(state: JobState): string {
  switch (state) {
    case 'completed':
    case 'failed':
    case 'delayed':
    case 'waiting-children':
      return 'zset';
    case 'active':
    case 'waiting':
      return 'list';
  }
  return 'unknown';
}
