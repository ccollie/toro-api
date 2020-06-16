'use strict';
import { getQueueById } from '../../helpers';
import { addJobSchema as addSchema } from '../../../../../queues';

export async function addJobSchema(_, { input }, ctx) {
  const { queueId, name, schema, defaultOpts } = input;
  const queue = await getQueueById(ctx, queueId);

  const result = await addSchema(queue, name, schema, defaultOpts);

  return {
    name,
    queue,
  };
}
