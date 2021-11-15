import { EZContext } from 'graphql-ez';
import { FieldConfig, JobTC } from '../index';
import { Job } from 'bullmq';
import boom from '@hapi/boom';
import { fieldsList } from 'graphql-fields-list';
import { Scripts } from '@alpen/core';

export const job: FieldConfig = {
  type: JobTC.NonNull,
  args: {
    queueId: 'ID!',
    id: 'ID!',
  },
  async resolve(
    _,
    { queueId, id },
    { accessors }: EZContext,
    info,
  ): Promise<Job> {
    const queue = accessors.getQueueById(queueId);

    const fields = fieldsList(info);
    const needState = fields.includes('state');
    const calls: Array<Promise<any>> = [queue.getJob(id)];
    if (needState) {
      calls.push(Scripts.getJobState(queue, id));
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
