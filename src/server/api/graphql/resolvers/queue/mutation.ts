import boom from '@hapi/boom';
import { isNumber } from 'lodash';
import { parseDuration } from '../../../../lib/datetime';
import { getQueueById, getQueueManager } from '../helpers';
import { QueueDeleteOptions } from '../../../../monitor';

const DEFAULT_LIMIT = 1000;

// TODO: use queueBus to publish messages for subscription support
export const Mutation = {
  async pauseQueue(_, { id }, context): Promise<any> {
    const manager = getQueueManager(context, id);
    await manager.pause();
    const isPaused = await manager.isPaused();
    const queue = manager.queue;
    return { isPaused, queue };
  },
  async resumeQueue(_, { id }, context): Promise<any> {
    const manager = getQueueManager(context, id);
    await manager.resume();
    const isPaused = await manager.isPaused();
    const queue = manager.queue;
    return { isPaused, queue };
  },
  async drainQueue(_, { id, delayed }, context): Promise<any> {
    const queue = getQueueById(context, id);
    await queue.drain(delayed);
    return { success: true, queue };
  },
  async cleanQueue(_, { input: { id, grace, status, limit } }, ctx) {
    const gracePeriod = parseDuration(grace);
    const queue = getQueueById(ctx, id);

    if (!isNumber(limit)) {
      limit = DEFAULT_LIMIT;
    }
    if (!isFinite(limit) || limit < 1) {
      throw boom.badRequest('limit must be a positive integer');
    }

    const jobIds = queue.clean(gracePeriod, limit, status);
    return {
      jobIds,
      queue,
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
