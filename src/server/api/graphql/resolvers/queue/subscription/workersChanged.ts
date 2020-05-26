import { keyBy } from 'lodash';
import { createResolver } from '../../../subscription';
import { GraphQLFieldResolver } from 'graphql';
import { getQueueManager } from '../../helpers';
import { QueueWorker } from '@src/types';
import { QueueManager } from '../../../../common/imports';

const POLLING_INTERVAL = 4500; // todo: get from config

type WorkersCache = Record<string, QueueWorker>;

export function workersChanged(): GraphQLFieldResolver<any, any> {
  let timer: NodeJS.Timeout;
  let added: QueueWorker[] = [];
  let removed: QueueWorker[] = [];
  let workersCache: WorkersCache = {};

  function getChannelName(_, { queueId }): string {
    return `WORKERS_CHANGED:${queueId}`;
  }

  async function updateWorkersCache(manager: QueueManager) {
    const newWorkers = await manager.getWorkers();

    workersCache = workersCache || {};

    const oldWorkers = Object.keys(workersCache);
    const newWorkersObject = keyBy(newWorkers, 'id');

    added = [];
    removed = [];

    for (let i = 0; i < newWorkers.length; i++) {
      const newWorker = newWorkers[i];
      const oldWorker = workersCache[newWorker.id];

      if (!oldWorker) {
        added.push(newWorker);
      }
    }

    for (let i = 0; i < oldWorkers.length; i++) {
      const oldWorker = oldWorkers[i];
      const newWorker = newWorkersObject[oldWorker];

      if (!newWorker) {
        removed.push(workersCache[oldWorker]);
      }
    }

    workersCache = newWorkersObject;
  }

  async function onSubscribe(_, args, context) {
    const { queueId } = args;
    const { pubsub, channelName } = context;
    const manager = getQueueManager(context, queueId);

    // get initial values
    await updateWorkersCache(manager);

    const handler = async (): Promise<void> => {
      const addedLength = added.length;
      const removedLength = removed.length;
      await updateWorkersCache(manager);

      if (added.length !== addedLength || removed.length !== removedLength) {
        return pubsub.publish(channelName, { added, removed });
      }
    };

    timer = setInterval(handler, POLLING_INTERVAL);
    timer.unref();
  }

  function onUnsubscribe(): void {
    clearInterval(timer);
  }

  return createResolver({
    channelName: getChannelName,
    onSubscribe,
    onUnsubscribe,
  });
}
