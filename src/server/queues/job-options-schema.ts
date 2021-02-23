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
  },
  additionalProperties: false,
  //  errorMessage: 'Options for repeatable job creation',
};

// eslint-disable-next-line max-len
// https://github.com/taskforcesh/bullmq/blob/2604753984a03d079ece28db0686d734ee10ba52/src/interfaces/jobs-options.ts
export const JobsOptionsSchema = {
  type: 'object',
  properties: {
    timestamp: {
      type: 'integer',
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
    },
    removeOnComplete: {
      anyOf: [{ type: 'boolean' }, { type: 'integer' }],
    },
    removeOnFail: {
      anyOf: [{ type: 'boolean' }, { type: 'integer' }],
    },
    stackTraceLimit: {
      type: 'integer',
      description:
        'Limits the amount of stack trace lines that will be recorded in the stacktrace.',
    },
    repeat: RepeatOptionsSchema,
  },
};
