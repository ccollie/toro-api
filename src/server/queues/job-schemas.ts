import boom from '@hapi/boom';
import fnv from 'fnv-plus';
import { isEmpty } from 'lodash';
import { getJobSchemaKey } from '../lib';
import { Queue, JobsOptions } from 'bullmq';
import { ValidateFunction } from 'ajv';
import { JobsOptionsSchema } from './job-options-schema';
import { logger, objToString, safeParse } from '../lib';

import { ajv, validate as ajvValidate } from '../validation/ajv';

const jobsOptionsValidator = ajv.compile(JobsOptionsSchema);

export type JobSchema = {
  schema: any;
  defaultOpts?: Partial<JobsOptions>;
  validate?: ValidateFunction;
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
    ajvValidate(jobsOptionsValidator, JobsOptionsSchema, options);
  }
}

function formatErrors(errors) {
  logger.warn(errors);
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
  validatorsByQueue.delete(queue);
  return deleted ? count : 0;
}

export function validateBySchema(
  jobName: string,
  jobSchema: JobSchema,
  data: Record<string, any>,
  options?: Partial<JobsOptions>,
): { options?: Partial<JobsOptions>; data: any } {
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
): Promise<{ options?: Partial<JobsOptions>; data: any }> {
  const jobSchema = await getJobSchema(queue, jobName);
  return validateBySchema(jobName, jobSchema, data, options);
}

export async function getJobNamesWithSchemas(queue: Queue): Promise<string[]> {
  const key = getJobSchemaKey(queue);
  return queue.client.then((client) => client.hkeys(key));
}