import { Queue } from 'bullmq';
import { schemaComposer } from 'graphql-compose';
import { FieldConfig } from '../../utils';

const LimiterTC = schemaComposer.createObjectTC({
  name: 'QueueLimiter',
  fields: {
    groupKey: {
      type: 'String',
      description: 'The group key to be used by the limiter when ' +
        'limiting by group keys.',
    },
    duration: {
      type: 'Int',
      description: 'The duration of the limiter in milliseconds. \n' +
        'During this time, a maximum of "max" jobs will be processed.'
    },
    max: {
      type: 'Int',
      description: 'The maximum number of jobs that can be processed during ' +
        'the period specified by "duration".'
    },
  },
});


export const limiter: FieldConfig = {
  type: LimiterTC,
  resolve: async (queue: Queue) => {
    return queue.limiter;
  },
};
