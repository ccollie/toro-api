'use strict';
import boom from '@hapi/boom';
import { getQueueById } from '../../helpers';
import { deleteJobSchema as deleteSchema } from '../../../../../queues';

export async function deleteJobSchema(_, { input }, ctx) {
  const { queueId, name } = input;
  const queue = await getQueueById(ctx, queueId);

  const result = await deleteSchema(queue, name);

  if (!result) {
    throw boom.notFound(`No schema found for "${name}"`);
  }

  return {
    name,
    queue,
  };
}
