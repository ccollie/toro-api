import { JobData, needsJob, subscribeToJob } from './subscribeToJob';
import { FieldConfig, JobTC, QueueTC } from '../../index';
import { schemaComposer } from 'graphql-compose';
import { Job } from 'bullmq';

const JobUpdatedPayloadTC = schemaComposer.createObjectTC({
  name: 'OnJobUpdatedPayload',
  description: 'Holds the changes to the state of a job',
  fields: {
    event: {
      type: 'String!', // todo: make an enum
      description: 'The event which triggered the update',
    },
    timestamp: 'Date!',
    delta: {
      type: 'JSONObject',
      description: 'updates in job state since the last event',
    },
    job: JobTC,
    queue: {
      type: QueueTC.NonNull,
      description: "The job's queue",
    },
  },
});

export const onJobUpdated: FieldConfig = {
  type: JobUpdatedPayloadTC.NonNull,
  args: {
    queueId: 'String!',
    jobId: 'String!',
  },
  resolve: async (parent: JobData, { queueId, jobId }, ctx, info) => {
    const { event, ts, ...rest } = parent;
    const queue = ctx.accessors.getQueueById(queueId);
    const result = {
      queue,
      event,
      timestamp: ts,
      data: rest,
    };
    if (needsJob(info)) {
      let job: Job = null;
      if (parent.event !== 'removed') {
        job = await queue.getJob(jobId);
      }
      result['job'] = job;
    }
    return result;
  },
  subscribe: subscribeToJob(),
};
