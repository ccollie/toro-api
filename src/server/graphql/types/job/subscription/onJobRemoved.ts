import { schemaComposer } from 'graphql-compose';
import { getQueueById } from '../../../helpers';
import { QueueTC, FieldConfig } from '../../index';
import { JobData, subscribeToJob } from './subscribeToJob';

export const onJobRemoved: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'OnJobRemovedPayload',
    fields: {
      queue: QueueTC.NonNull,
      jobId: 'String!',
    },
  }).NonNull,
  args: {
    queueId: 'String!',
    jobId: 'String!',
  },
  resolve: async (parent: JobData, { queueId, jobId }) => {
    const queue = getQueueById(queueId);
    return {
      queue,
      jobId,
    };
  },
  subscribe: subscribeToJob((jobData) => jobData.event === 'removed'),
};
