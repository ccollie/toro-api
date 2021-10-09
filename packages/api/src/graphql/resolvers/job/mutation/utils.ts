import boom from '@hapi/boom';
import { EZContext } from 'graphql-ez';
import { isString } from 'lodash';
import { schemaComposer } from 'graphql-compose';
import { FieldConfig, QueueTC } from '../../index';
import { Job, Queue } from 'bullmq';
import { publishJobAdded } from '../subscription/onJobAdded';
import { bulkJobHandler, createJob, JobCreationOptions } from '@alpen/core';

export async function addJob(
  context: EZContext,
  queue: Queue,
  jobName: string,
  data: Record<string, any>,
  opts,
): Promise<Job> {
  const jobOptions: JobCreationOptions = {
    name: jobName,
    data,
    opts,
  };
  const job = await createJob(queue, jobOptions);
  await publishJobAdded(context, queue, job); // should we just fire and forget instead of waiting ?
  return job;
}

export const BulkStatusItem = schemaComposer.createObjectTC({
  name: 'BulkStatusItem',
  fields: {
    id: 'ID!',
    success: 'Boolean!',
    reason: 'String',
  },
});

const BulkJobActionInput = schemaComposer.createInputTC({
  name: 'BulkJobActionInput',
  fields: {
    queueId: 'ID!',
    jobIds: '[ID!]!',
  },
});

const BulkJobActonPayload = schemaComposer.createObjectTC({
  name: 'BulkJobActionPayload',
  fields: {
    queue: QueueTC.NonNull,
    status: BulkStatusItem.List.NonNull,
  },
});

export function createBulkMutationHandler(
  action: string,
  options: Partial<FieldConfig>,
): FieldConfig {
  const BULK_ACTIONS = ['remove', 'retry', 'promote'];
  if (!BULK_ACTIONS.includes(action)) {
    throw boom.forbidden(`action ${action} not permitted`);
  }

  return Object.assign({}, options as Record<string, any>, {
    type: BulkJobActonPayload,
    args: {
      input: BulkJobActionInput.NonNull,
    },
    async resolve(_, { input }, { accessors }: EZContext): Promise<any> {
      const { queueId, jobIds } = input;
      const queue = accessors.getQueueById(queueId);

      const status = await bulkJobHandler(action, queue, jobIds);

      status.forEach((status) => {
        if (status.reason && !isString(status.reason)) {
          status.reason = status.reason.toString();
        }
      });

      return {
        queue,
        status,
      };
    },
  });
}
