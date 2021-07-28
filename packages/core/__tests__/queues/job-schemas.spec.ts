import pMap from 'p-map';
import { clearDb, createClient } from '../factories';
import { nanoid } from 'nanoid';
import { Queue, JobsOptions } from 'bullmq';
import {
  compileSchema,
  addJobSchema,
  deleteAllSchemas,
  deleteJobSchema,
  getJobSchema,
  getJobSchemas,
  getJobNamesWithSchemas,
  validateJobOptions,
  validateBySchema,
  validateJobData,
} from '../../src/queues';
import { getJobSchemaKey } from '../../src/keys';

describe('jobSchema', function () {
  let queue, queueName, client;

  beforeEach(async function () {
    queueName = 'test-' + nanoid(5);
    client = await createClient();
    queue = new Queue(queueName, { connection: client });
  });

  afterEach(async function () {
    await clearDb(client);
    await queue.close();
  });

  function getKey(): string {
    return getJobSchemaKey(queue);
  }

  function getHashValue(name: string): string {
    const key = getKey();
    return client.hget(key, name);
  }

  const simpleSchema = {
    type: 'object',
    properties: {
      name: { type: 'string', pattern: '^\\w+$' },
      value: { type: 'string' },
    },
    additionalProperties: false,
    required: ['name', 'value'],
  };

  const invalidSchema = {
    type: 'object',
    properties: {
      name: { type: 'string', pattern: '^\\w+$' },
      invalidProp: { type: 'invalid', default: false },
    },
    additionalProperties: false,
  };

  const validJobOptions: JobsOptions = {
    timeout: 5000,
    removeOnFail: true,
    lifo: true,
    attempts: 5,
  };

  // Typescript catches dev errors, but
  // we'll be getting this info as a JSON
  // blob from the client
  const invalidJobOption = {
    timeout: 5000,
    removeOnFail: 'hell naw',
    attempts: 'twenty two',
  };

  describe('validateJobOptions', () => {
    it('it should pass validation for valid options', () => {
      expect(() => validateJobOptions(validJobOptions)).not.toThrow();
    });

    it('it should pass validation for empty options', () => {
      expect(() => validateJobOptions({})).not.toThrow();
      expect(() => validateJobOptions(null)).not.toThrow();
    });

    it('it should throw for invalid options', () => {
      // Typescript catches dev errors, but we'll be getting this info as a JSON
      // blob from the client, so we force the cast to test
      const opts = invalidJobOption as any as JobsOptions;
      expect(() => validateJobOptions(opts)).toThrow();
    });
  });

  describe('compileSchema', () => {
    it('it should create a JobSchema', () => {
      const schema = compileSchema('test', simpleSchema, validJobOptions);

      expect(schema).toBeDefined();
      expect(schema.hash).toBeDefined();
      expect(typeof schema.validate).toBe('function');
      expect(schema.defaultOpts).toEqual(validJobOptions);
      expect(schema.schema).toEqual(simpleSchema);
    });

    it('it should throw if no names is provided', () => {
      expect(() => compileSchema(null, simpleSchema)).toThrow(
        /job names is required/,
      );
    });

    it('it should throw if an empty json schema is provided', () => {
      expect(() => compileSchema('test', null)).toThrow(/missing json schema/);
      expect(() => compileSchema('test', {})).toThrow(/missing json schema/);
    });
  });

  describe('addJobSchema', function () {
    const jsonSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', pattern: '^\\w+$' },
        description: { default: 'no description provided', type: 'string' },
        a: { type: 'boolean', default: false },
        b: {
          oneOf: [
            { default: 'a is true', type: 'string' },
            { type: 'number', default: 0 },
          ],
        },
      },
      additionalProperties: false,
      required: ['name', 'a'],
    };

    it('it can create a job schema', async () => {
      const saved = await addJobSchema(
        queue,
        'test',
        jsonSchema,
        validJobOptions,
      );
      expect(saved).toBeDefined();
      expect(saved.hash).toBeDefined();
      expect(typeof saved.validate).toBe('function');
      expect(saved.defaultOpts).toEqual(validJobOptions);
      expect(saved.schema).toEqual(jsonSchema);

      const data = await getHashValue('test');
      expect(data).toBeDefined();
    });

    it('It validates the schema before saving', async () => {
      await expect(
        addJobSchema(queue, 'test', invalidSchema),
      ).rejects.toThrow();
    });

    it('It validates the default options on creation', async () => {
      throw new Error('Not Implemented');
    });
  });

  describe('getJobSchema', () => {
    it('it can retrieve stored schemas', async () => {
      const saved = await addJobSchema(
        queue,
        'getJobSchema',
        simpleSchema,
        validJobOptions,
      );
      const retrieved = await getJobSchema(queue, 'getJobSchema');

      expect(retrieved).toBeDefined();
      expect(typeof retrieved.validate).toBe('function');
      expect(saved.defaultOpts).toEqual(retrieved.defaultOpts);
      expect(saved.schema).toEqual(retrieved.schema);
      expect(saved.hash).toEqual(retrieved.hash);
    });

    it('it returns null on non-existent schema', async () => {
      const nonExistent = nanoid(10);
      const retrieved = await getJobSchema(queue, nonExistent);

      expect(retrieved).toBeNull();
    });
  });

  describe('getJobSchemas', () => {
    const JobNames = ['lorem', 'ipsum', 'dolor', 'sit', 'amet'];

    async function createSchemas() {
      await pMap(JobNames, (name) => addJobSchema(queue, name, simpleSchema));
    }

    function validateSchema(schema) {
      expect(schema.schema).toEqual(simpleSchema);
      expect(schema.hash).toBeDefined();
      expect(schema.defaultOptions).toBeUndefined();
      expect(typeof schema.validate).toEqual('function');
    }

    it('it can get multiple schemas at once', async () => {
      await createSchemas();
      const schemas = await getJobSchemas(queue, ['dolor', 'lorem', 'sit']);
      expect(typeof schemas).toBe('object');
      const keys = Object.keys(schemas).sort();
      expect(keys).toEqual(['dolor', 'lorem', 'sit']);

      keys.forEach((key) => {
        validateSchema(schemas[key]);
      });
    });

    it('it gets all schemas if no job names are specified', async () => {
      await createSchemas();
      const schemas = await getJobSchemas(queue);
      expect(typeof schemas).toEqual('object');
      const keys = Object.keys(schemas).sort();
      expect(keys).toEqual(JobNames.sort());
      keys.forEach((key) => {
        validateSchema(schemas[key]);
      });
    });
  });

  describe('getJobNamesWithSchemas', () => {
    const JobNames = ['lorem', 'ipsum', 'dolor', 'sit', 'amet'];

    async function createSchemas() {
      await pMap(JobNames, (name) => addJobSchema(queue, name, simpleSchema));
    }

    it('it can get the names of jobs containing schemas', async () => {
      await createSchemas();
      let names = await getJobNamesWithSchemas(queue);
      expect(Array.isArray(names)).toBe(true);
      names = names.sort();

      expect(names).toEqual(JobNames.sort());
    });
  });

  describe('deleteJobSchema', () => {
    it('it can delete an existing schema', async () => {
      const saved = await addJobSchema(queue, 'test', simpleSchema);
      expect(saved).toBeDefined();
      const deleted = await deleteJobSchema(queue, 'test');
      expect(deleted).toBe(true);
      const data = await getHashValue('test');
      expect(data).toBeNull();
    });

    it('it returns false for an non-existent schema', async () => {
      const nonExistent = nanoid(10);
      const deleted = await deleteJobSchema(queue, nonExistent);
      expect(deleted).toBe(false);
    });
  });

  describe('deleteAllSchemas', () => {
    it('it should delete all schemas for a queue', async () => {
      const names = ['lorem', 'ipsum', 'dolor', 'sit', 'amet'];
      await pMap(names, (name) => addJobSchema(queue, name, simpleSchema));
      // ensure we've stored our values
      const items = await client.hgetall(getKey());
      expect(Object.keys(items).length).toBe(names.length);

      const deleteCount = await deleteAllSchemas(queue);
      expect(deleteCount).toBe(names.length);
    });
  });

  describe('validateBySchema', () => {
    const schemaWithDefaults = {
      type: 'object',
      properties: {
        name: { type: 'string', pattern: '^\\w+$' },
        intAsString: { type: 'integer' },
        defaultValue: { type: 'string', default: 'default string' },
        value: { type: 'string' },
      },
      additionalProperties: false,
      required: ['name', 'value'],
    };

    it('it returns validated data', () => {
      const input = {
        name: 'sparkle',
        intAsString: '10',
        value: nanoid(6),
      };
      const schema = compileSchema('test', schemaWithDefaults);
      const { data } = validateBySchema('test', schema, input);

      expect(data.name).toBe(input.name);
      expect(data.intAsString).toBe(10);
      expect(data.defaultValue).toBe('default string');
      expect(data.value).toBe(input.value);
    });

    it('it merges default options and passed values', () => {
      const input = {
        name: 'sparkle',
        intAsString: '10',
        value: nanoid(6),
      };

      const defaultOptions: Partial<JobsOptions> = {
        timestamp: Date.now(),
        attempts: 20,
        repeat: {
          cron: '*/5 * * * *',
        },
      };

      const opts: Partial<JobsOptions> = {
        lifo: true,
        stackTraceLimit: 10,
        timestamp: defaultOptions.timestamp + 2000,
      };

      const mergedOptions = Object.assign({}, defaultOptions, opts);

      const schema = compileSchema('test', schemaWithDefaults, defaultOptions);
      const { options } = validateBySchema('test', schema, input, opts);

      expect(options).toStrictEqual(mergedOptions);
    });

    it('fails validation on invalid data', () => {
      const schema = compileSchema('test', simpleSchema);
      const input = { name: 'test' }; // value is required
      expect(() => validateBySchema('test', schema, input)).toThrow();
    });

    it('fails validation on invalid options', () => {
      const schema = compileSchema('test', simpleSchema);
      const input = { name: 'valid_name', value: 'valid value' };
      // Typescript catches dev errors, but we'll be getting this info as a JSON
      // blob from the client, so we force the cast to test
      const opts = invalidJobOption as any as JobsOptions;
      expect(() => validateBySchema('test', schema, input, opts)).toThrow();
    });
  });

  describe('validateJobData', () => {
    it('can validate job data', async () => {
      await addJobSchema(queue, 'test', simpleSchema, validJobOptions);
      const data = { name: 'test_name', value: 'test_value' };
      await expect(validateJobData(queue, 'test', data)).resolves.not.toThrow();
    });

    it('throws on invalid data', async () => {
      await addJobSchema(queue, 'test', simpleSchema, validJobOptions);
      const data = { value: 'test_value' };
      await expect(validateJobData(queue, 'test', data)).rejects.toThrow();
    });

    it('throws on invalid options', async () => {
      await addJobSchema(queue, 'test', simpleSchema, validJobOptions);
      const data = { name: 'name', value: 'test_value' };
      // Typescript catches dev errors, but we'll be getting this info as a JSON
      // blob from the client, so we force the cast to test
      const opts = invalidJobOption as any as JobsOptions;
      await expect(
        validateJobData(queue, 'test', data, opts),
      ).rejects.toThrow();
    });
  });
});
