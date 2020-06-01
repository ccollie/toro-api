import { parseDuration } from '../../../../lib/datetime';
import { getQueueById, getQueueManager } from '../helpers';
import { QueueDeleteOptions } from '../../../../monitor';

// TODO: use queueBus to publish messages for subscription support
export const Mutation = {
  async pauseQueue(_, { id }, context): Promise<any> {
    const manager = getQueueManager(context, id);
    await manager.pause();
    const isPaused = await manager.isPaused();
    return { isPaused };
  },
  async resumeQueue(_, { id }, context): Promise<any> {
    const manager = getQueueManager(context, id);
    await manager.resume();
    const isPaused = await manager.isPaused();
    return { isPaused };
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
  async deleteQueue(_, { id, options }, { supervisor }) {
    const deletedKeys = await supervisor.deleteQueue(
      id,
      options as QueueDeleteOptions,
    );
    return { deletedKeys };
  },
};
