import { JobTC, QueueTC, FieldConfig } from '../../index';
import { getQueueById } from '../../../helpers';
import { schemaComposer } from 'graphql-compose';
import { JobProgress } from '../../scalars';
import { JobData, needsJob, subscribeToJob } from './subscribeToJob';

export const onJobProgress: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'OnJobProgressPayload',
    fields: {
      job: JobTC.NonNull,
      queue: QueueTC.NonNull,
      progress: JobProgress,
    },
  }).NonNull,
  args: {
    queueId: 'String!',
    jobId: 'String!',
  },
  resolve: async (parent: JobData, { queueId, jobId }, ctx, info) => {
    const queue = getQueueById(queueId);
    const result = {
      queue,
      progress: parent.progress,
    };
    if (needsJob(info)) {
      result['job'] = await queue.getJob(jobId);
    }
    return result;
  },
  subscribe: subscribeToJob((jobData) => jobData.event === 'progress'),
};
