// https://github.com/taskforcesh/bullmq/blob/master/src/interfaces/repeat-options.ts
const RepeatOptionsSchema = {
  type: 'object',
  properties: {
    cron: {
      type: 'string',
      description: 'Cron expression',
    },
    tz: {
      type: 'string',
      description: 'Timezone',
    },
    limit: {
      type: 'integer',
      description: 'Number of times the job should repeat at max.',
    },
    startDate: {
      type: 'integer',
      description:
        'Start date when the repeat job should start repeating (only with cron).',
    },
    endDate: {
      type: 'integer',
      description: 'End date when the repeat job should stop repeating.',
    },
    every: {
      type: 'integer',
      minimum: 0,
      description:
        'Repeat every millis (cron setting cannot be used together with this setting.)',
    },
    immediately: {
      type: 'boolean',
      description:
        'Repeated job should start right now (works only with every settings)',
    },
    count: {
      type: 'integer',
    },
    prevMillis: {
      type: 'integer',
    },
    offset: {
      type: 'integer',
    },
    jobId: {
      type: 'string',
      description: 'Timezone',
    },
  },
  additionalProperties: false,
  //  errorMessage: 'Options for repeatable job creation',
};

const JobParentSchema = {
  type: 'object',
  properties: {
    id: {
      type: 'string',
    },
    queue: {
      type: 'string',
    },
  },
  required: ['queue', 'id'],
};

const JobRemoveOptions = {
  oneOf: [
    {
      type: 'object',
      properties: {
        age: {
          type: 'number',
          description: 'Maximum age in seconds for job to be kept.',
        },
        count: {
          type: 'number',
          description: 'Maximum number of jobs to be kept.',
        },
      },
      additionalProperties: false,
    },
    {
      type: 'boolean',
      description: 'If true, removes the job when it fails after all attempts.',
    },
    {
      type: 'integer',
      description: 'Specifies the maximum amount of jobs to keep'
    },
  ],
};

// eslint-disable-next-line max-len
// https://https://github.com/taskforcesh/bullmq/blob/master/src/interfaces/jobs-options.ts
export const BulkJobsOptionsSchema = {
  type: 'object',
  properties: {
    timestamp: {
      type: 'integer',
      description: 'Timestamp when the job was created. Defaults to current unix timestamp',
    },
    priority: {
      type: 'integer',
      minimum: 1,
      description:
        'Ranges from 1 (highest priority) to MAX_INT  (lowest priority).',
    },
    delay: {
      type: 'integer',
      description:
        'An amount of milliseconds to wait until this job can be processed.',
      minimum: 0,
    },
    attempts: {
      type: 'integer',
      description:
        'The total number of attempts to try the job until it completes.',
      minimum: 0,
    },
    rateLimiterKey: {
      type: 'string',
      description:
        'Rate limiter key to use if rate limiter enabled.',
    },
    backoff: {
      oneOf: [
        {
          type: 'object',
          required: ['type'],
          properties: {
            type: {
              type: 'string',
            },
            delay: {
              type: 'number',
            },
          },
        },
        {
          type: 'integer',
        },
      ],
    },
    lifo: {
      type: 'boolean',
      description:
        'if true, adds the job to the end of the queue instead of the left (default false)',
    },
    timeout: {
      type: 'integer',
      minimum: 0,
      description:
        'The number of milliseconds after which the job should be FAILED without a timeout error',
    },
    jobId: {
      type: 'string',
      description: 'Override the job ID - by default, the job ID is a unique' +
        'integer, but this setting can be used to override it.',
    },
    removeOnComplete: JobRemoveOptions,
    removeOnFail: JobRemoveOptions,
    stackTraceLimit: {
      type: 'integer',
      description:
        'Limits the amount of stack trace lines that will be recorded in the stacktrace.',
    },
    parent: JobParentSchema,
    prevMillis: {
      type: 'integer',
      description:
        'Property used by repeatable jobs.'
    },
    sizeLimit: {
      type: 'integer',
      description:
        'Limits the size in bytes of the job\'s data payload (as a JSON serialized string).'
    },
  },
};

const JobOptionsSchema = { ...BulkJobsOptionsSchema };
JobOptionsSchema.properties['repeat'] = RepeatOptionsSchema;

export { JobOptionsSchema };
