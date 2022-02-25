import boom from '@hapi/boom';
import { EZContext } from 'graphql-ez';
import { isString } from '@alpen/shared';
import { schemaComposer } from 'graphql-compose';
import { FieldConfig, QueueTC } from '../../index';
import { Job, Queue } from 'bullmq';
import { publishJobAdded } from '../subscription/onJobAdded';
import {
  bulkJobHandler,
  createJob,
  JobCreationOptions,
} from '@alpen/core';

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
  const manager = context.accessors.getQueueManager(queue, true); // force check for readonly
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
      // validate retries
      if (action === 'retry') {
        const manager = accessors.getQueueManager(queueId, true); // force check for readonly
        if (!(manager?.config.allowRetries ?? true)) {
          throw boom.forbidden('retries forbidden by config');
        }
      }
      const queue = accessors.getQueueById(queueId, true);

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
