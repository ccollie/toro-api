import { FieldConfig, JobTC } from '../types';
import { getQueueById } from '../helpers';
import { getJobState } from '../../queues';
import { Job } from 'bullmq';
import boom from '@hapi/boom';
import { fieldsList } from 'graphql-fields-list';

export const job: FieldConfig = {
  type: JobTC,
  args: {
    queueId: 'ID!',
    id: 'ID!',
  },
  async resolve(_, { queueId, id }, ctx, info): Promise<Job> {
    const queue = getQueueById(queueId);

    const fields = fieldsList(info);
    const needState = fields.includes('state');
    const calls: Array<Promise<any>> = [queue.getJob(id)];
    if (needState) {
      calls.push(getJobState(queue, id));
    }

    const [job, state] = await Promise.all(calls);

    if (job) {
      // hacky
      (job as any).queueId = queueId;
      if (needState) {
        (job as any).state = state;
      }
    } else {
      throw boom.notFound(`Job with id#${id}`);
    }
    return job;
  },
};
