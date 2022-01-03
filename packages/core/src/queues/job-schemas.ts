import * as boom from '@hapi/boom';
import fnv from 'fnv-plus';
import { isEmpty } from 'lodash';
import { JobsOptions, Queue } from 'bullmq';
import { ValidateFunction } from 'ajv';
import { JobOptionsSchema } from './job-options-schema';
import { hashObject, objToString, safeParse } from '@alpen/shared';
import toJsonSchema from 'to-json-schema';

import { ajv, validate as ajvValidate } from '../validation/ajv';
import { getIterator } from './job-iterator';
import { getJobSchemaKey } from '../keys';

const jobsOptionsValidator = ajv.compile(JobOptionsSchema);

const INFER_SAMPLE_SIZE = 25;

export type JobSchema = {
  jobName: string;
  schema: any;
  defaultOpts?: Partial<JobsOptions>;
  validate?: ValidateFunction;
  inferred?: boolean;
  hash?: string;
};

const validatorsByQueue = new WeakMap<Queue, Map<string, JobSchema>>();

function hashSchema(schema: any): string {
  const schemaAsString = objToString(schema);
  return fnv.hash(schemaAsString).hex();
}

function getLocalValidator(queue: Queue, jobName: string): JobSchema {
  const map = validatorsByQueue.get(queue);
  return map && map.get(jobName);
}

export function validateJobOptions(options: Partial<JobsOptions>): void {
  if (!isEmpty(options)) {
    ajvValidate(jobsOptionsValidator, JobOptionsSchema, options);
  }
}

export function compileSchema(
  name: string,
  schema: Record<string, any>,
  options?: Partial<JobsOptions>,
): JobSchema {
  if (!name) {
    throw boom.badRequest('job names is required');
  }
  if (isEmpty(schema)) {
    throw boom.badRequest('missing json schema');
  }
  let validate;
  try {
    validate = ajv.compile(schema);
  } catch (err) {
    throw boom.badRequest(`Schema for "${name}" is invalid`, ajv.errors);
  }

  validateJobOptions(options);

  const hash = hashSchema(schema);
  return {
    jobName: name,
    schema,
    hash,
    validate,
    ...(options && { defaultOpts: options }),
  };
}

function updateLocalCache(
  queue: Queue,
  name: string,
  schema: JobSchema,
): JobSchema {
  let stored = getLocalValidator(queue, name);
  if (!stored || stored.hash !== schema.hash || !schema.validate) {
    stored = compileSchema(name, schema.schema, schema.defaultOpts);
    let map = validatorsByQueue.get(queue);
    if (!map) {
      map = new Map<string, JobSchema>();
      validatorsByQueue.set(queue, map);
    }
    map.set(name, stored);
  }
  return stored;
}

function unserialize(queue: Queue, name: string, data: string): JobSchema {
  const value = safeParse(data);
  if (!value) return null;
  const schema = value as JobSchema;
  const map = validatorsByQueue.get(queue);
  const old = map.get(name);
  schema.validate = old && old.validate;
  return updateLocalCache(queue, name, schema);
}

function serialize(jobSchema: JobSchema): string {
  const { hash, schema } = jobSchema;
  const data = { schema, hash: hash || hashSchema(schema) };
  if (jobSchema.defaultOpts) {
    (data as any).defaultOptions = jobSchema.defaultOpts;
  }
  return JSON.stringify(data);
}

export async function addJobSchema(
  queue: Queue,
  jobName: string,
  jsonSchema: Record<string, any>,
  defaultOptions?: Partial<JobsOptions>,
): Promise<JobSchema> {
  const client = await queue.client;
  const key = getJobSchemaKey(queue);

  const schema = compileSchema(jobName, jsonSchema, defaultOptions);
  const toStore = serialize(schema);
  await client.hset(key, jobName, toStore);

  return updateLocalCache(queue, jobName, schema);
}

function inferOptions(recs: Record<string, any>[]): Partial<JobsOptions> {
  if (!recs.length) return {};
  const hashMap = new Map<string, JobsOptions>();
  const counts = new Map<string, number>();
  for (let i = 0; i < recs.length; i++) {
    const obj = recs[i];
    const hash = hashObject(obj);
    hashMap.set(hash, obj);
    let count = 1;
    if (counts.has(hash)) {
      count = counts.get(hash) + 1;
    }
    counts.set(hash, count);
  }
  const item = Array.from(counts).sort((a, b) => {
    return b[1] - a[1];
  })?.[0];
  if (item) {
    return hashMap.get(item[0]) || {};
  }
  return {};
}

const DEFAULT_INFER_SCHEMA_SCAN_COUNT = 25;

export async function inferJobSchema(
  queue: Queue,
  jobName?: string,
): Promise<JobSchema> {
  // get a list of items from completed list
  const it = getIterator(queue, 'completed', [
    'data',
    'opts',
    'jobName',
  ], DEFAULT_INFER_SCHEMA_SCAN_COUNT, jobName);
  const sampleSize = INFER_SAMPLE_SIZE;
  const jobs: Record<string, any>[] = [];
  const opts: Record<string, any>[] = [];
  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/label
  mainLoop: for await (const jobs of it.generator()) {
    for (const job of jobs) {
      if (!jobName || jobName === job['jobName']) {
        const data = safeParse(job['data']);
        const jobOpts = safeParse(job['opts']);
        if (data) {
          jobs.push(data);
        }
        if (jobOpts) {
          opts.push(jobOpts);
        }
      }
      if (jobs.length >= sampleSize) {
        break mainLoop;
      }
    }
  }

  if (!jobs.length) {
    throw boom.badData('Cannot infer schema. No completed jobs found.');
  }

  const res = toJsonSchema(jobs, { arrays: { mode: 'all' } });
  const schema = res?.type === 'array' ? res?.items : res;

  const options = inferOptions(opts);

  validateJobOptions(options);

  const hash = hashSchema(schema);
  return {
    jobName,
    schema,
    hash,
    // validate,
    ...(options && { defaultOpts: options }),
  };
}

export async function getJobSchema(
  queue: Queue,
  jobName: string,
): Promise<JobSchema> {
  const client = await queue.client;
  const key = getJobSchemaKey(queue);
  const value = await client.hget(key, jobName);
  return unserialize(queue, jobName, value);
}

export async function getJobSchemas(
  queue: Queue,
  jobNames?: string[],
): Promise<Record<string, JobSchema>> {
  const client = await queue.client;
  const key = getJobSchemaKey(queue);
  let schemas;
  if (jobNames) {
    const values = await client.hmget(key, jobNames);
    schemas = Object.create(null);
    values.forEach((data, index) => {
      if (data) {
        schemas[jobNames[index]] = data;
      }
    });
  } else {
    schemas = await client.hgetall(key);
  }

  const result = Object.create(null) as Record<string, JobSchema>;

  for (const [jobName, data] of Object.entries(schemas)) {
    if (data) {
      const value = unserialize(queue, jobName, data as string);
      if (value) {
        result[jobName] = value;
      }
    }
  }

  return result;
}

export async function deleteJobSchema(
  queue: Queue,
  jobName: string,
): Promise<boolean> {
  const client = await queue.client;
  const key = getJobSchemaKey(queue);
  const deleted = await client.hdel(key, jobName);
  if (!!deleted) {
    const validatorMap = validatorsByQueue.get(queue);
    if (validatorMap) {
      const schema = validatorMap.get(jobName);
      if (schema) {
        ajv.removeSchema(schema);
      }
      validatorMap.delete(jobName);
      if (validatorMap.size === 0) {
        validatorsByQueue.delete(queue);
      }
    }
  }
  return !!deleted;
}

export async function deleteAllSchemas(queue: Queue): Promise<number> {
  const client = await queue.client;
  const key = getJobSchemaKey(queue);
  const pipeline = client.multi();
  pipeline.hkeys(key);
  pipeline.del(key);
  const response = await pipeline.exec();
  const items = response[0][1];
  const count = items ? items.length : 0;
  const deleted = !!response[1][1];
  const map = validatorsByQueue.get(queue);
  if (map) {
    validatorsByQueue.delete(queue);
    map.forEach(({ schema }) => ajv.removeSchema(schema));
  }

  return deleted ? count : 0;
}

export interface JobValidationResult {
  options?: Partial<JobsOptions>;
  data: any;
}

export function validateBySchema(
  jobName: string,
  jobSchema: JobSchema,
  data: Record<string, any>,
  options?: Partial<JobsOptions>,
): JobValidationResult {
  if (jobSchema) {
    const opts = Object.assign({}, jobSchema.defaultOpts || {}, options || {});

    validateJobOptions(opts);
    ajvValidate(jobSchema.validate, jobSchema.schema, data);

    return { options: opts, data };
  }
  return { options, data };
}

export async function validateJobData(
  queue: Queue,
  jobName: string,
  data: Record<string, any>,
  options?: Partial<JobsOptions>,
): Promise<JobValidationResult> {
  const jobSchema = await getJobSchema(queue, jobName);
  return validateBySchema(jobName, jobSchema, data, options);
}

export async function getJobNamesWithSchemas(queue: Queue): Promise<string[]> {
  const key = getJobSchemaKey(queue);
  return queue.client.then((client) => client.hkeys(key));
}
