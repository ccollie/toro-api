import { getQueueById } from '../../helpers';

export async function removeRepeatableJobByKey(_, { input }, ctx) {
  const { queueId, key } = input;
  const queue = getQueueById(ctx, queueId);
  await queue.removeRepeatableByKey(key);
  return {
    key,
    queue,
  };
}
