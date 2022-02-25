import { schemaComposer } from 'graphql-compose';
import { JobRemoveOption } from '../../../scalars';

const BaseRepeatOptionFields = {
  tz: 'String',
  endDate: 'Date',
  limit: 'Int',
  count: 'Int',
  prevMillis: 'Int',
  jobId: 'String',
  startDate: 'Date',
};

const AllRepeatFields = {
  ...BaseRepeatOptionFields,
  cron: 'String',
  every: 'String',
};

export const RepeatOptionsTC = schemaComposer.createObjectTC({
  name: 'JobRepeatOptions',
  fields: AllRepeatFields,
});

const RepeatOptionsEveryInputTC = schemaComposer.createInputTC({
  name: 'JobRepeatOptionsEveryInput',
  fields: {
    ...BaseRepeatOptionFields,
    every: 'String!',
  },
});

const RepeatOptionsCronInputTC = schemaComposer.createInputTC({
  name: 'JobRepeatOptionsCronInput',
  fields: {
    ...BaseRepeatOptionFields,
    cron: 'String!',
  },
});

export const JobParentTC = schemaComposer.createObjectTC({
  name: 'JobParent',
  fields: {
    id: {
      type: 'String!',
      description: 'The id of the job',
    },
    queue: {
      type: 'String!',
      description:
        'The name of the queue (including prefix) containing the job',
    },
  },
});

export const JobOptionsTC = schemaComposer.createObjectTC({
  name: 'JobOptions',
  fields: {
    timestamp: {
      type: 'Date',
      description: 'Timestamp when the job was created. Defaults to `Date.now()',
    },
    priority: {
      type: 'Int',
      description:
        'Ranges from 1 (highest priority) to MAX_INT  (lowest priority). ' +
        // eslint-disable-next-line max-len
        'Note that using priorities has a slight impact on performance, so do not use it if not required.',
    },
    delay: {
      type: 'Int',
      description:
        'An amount of milliseconds to wait until this job can be processed. \n' +
        'Note that for accurate delays, worker and producers should have their ' +
        'clocks synchronized.',
    },
    attempts: {
      type: 'Int',
      description:
        'The total number of attempts to try the job until it completes.',
    },
    backoff: {
      type: 'JSON',
      description: 'Backoff setting for automatic retries if the job fails',
    }, // | TODO: BackoffOptions
    lifo: {
      type: 'Boolean',
      description:
        'if true, adds the job to the right of the queue instead of the left (default false)',
    },
    timeout: {
      type: 'Int',
      description:
        // eslint-disable-next-line max-len
        'The number of milliseconds after which the job should be fail with a timeout error [optional]',
    },
    jobId: {
      type: 'String',
      description:
        'Override the job ID - by default, the job ID is a unique ' +
        'integer, but you can use this setting to override it. ' +
        'If you use this option, it is up to you to ensure the ' +
        'jobId is unique. If you attempt to add a job with an id that ' +
        'already exists, it will not be added.',
    },
    removeOnComplete: {
      type: JobRemoveOption,
      description:
        'If true, removes the job when it successfully completes.' +
        '  A number specify the max amount of jobs to keep.' +
        '  Default behavior is to keep the job in the COMPLETED set.',
    },
    removeOnFail: {
      type: JobRemoveOption,
      description:
        'If true, removes the job when it fails after all attempts.' +
        '  A number specify the max amount of jobs to keep.' +
        '  Default behavior is to keep the job in the FAILED set.',
    }, //bool | int
    rateLimiterKey: {
      type: 'String',
      description: 'Rate limiter key to use if rate limiter enabled.',
    },
    stackTraceLimit: {
      type: 'Int',
      description:
        'Limits the amount of stack trace lines that will be recorded in the stacktrace.',
    },
    parent: JobParentTC,
    sizeLimit: {
      type: 'Int',
      description:
        'Limits the size in bytes of the job\'s data payload (as a JSON serialized string).',
    },
  },
});

export const JobOptionsEveryInputTC = JobOptionsTC.getITC()
  .setTypeName('JobOptionsEveryInput')
  .addFields({
    repeat: {
      type: RepeatOptionsEveryInputTC,
      makeRequired: true,
    },
  });

export const JobOptionsCronInputTC = JobOptionsTC.getITC()
  .setTypeName('JobOptionsCronInput')
  .addFields({
    repeat: {
      type: RepeatOptionsCronInputTC,
      makeRequired: true,
    },
  });

JobOptionsTC.addFields({
  repeat: {
    type: RepeatOptionsTC,
    description: 'Job repeat options',
  },
});
