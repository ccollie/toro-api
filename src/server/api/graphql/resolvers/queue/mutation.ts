import { parseDuration } from '../../../../lib/datetime';
import { getQueueById } from '../helpers';
import { Queue } from 'bullmq';

// TODO: use queueBus to publish messages for subscription support
export const Mutation = {
  async pauseQueue(_, { id }, context): Promise<any> {
    const queue = getQueueById(context, id);
    await queue.resume();
    return {};
  },
  async resumeQueue(_, { id }, context): Promise<any> {
    const queue = getQueueById(context, id);
    await queue.pause();
    return {};
  },
  async drainQueue(_, { id, delayed }, context): Promise<any> {
    const queue = getQueueById(context, id);
    await queue.drain(delayed);
    return {};
  },
  async cleanQueue(_, args, ctx) {
    const { id, grace, limit, type } = args;
    const gracePeriod = parseDuration(grace);
    const queue = getQueueById(ctx, id);
    const jobIds = queue.clean(gracePeriod, limit, type);
    return {
      jobIds,
    };
  },
  async deleteQueue(_, { id }, { supervisor }) {
    const deletedKeys = await supervisor.deleteQueue(id);
    return { deletedKeys };
  },
};
