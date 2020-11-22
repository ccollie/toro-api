import { keyBy } from 'lodash';
import { createSubscriptionResolver } from '../../../helpers';
import { GraphQLFieldResolver } from 'graphql';
import { getQueueManager } from '../../../helpers';
import { QueueWorker } from '../../../../../types';
import { logger, QueueManager } from '../../../imports';
import { FieldConfig } from '../../index';
import { schemaComposer } from 'graphql-compose';
import { QueueWorkerTC } from '../model/Queue.workers';

const POLLING_INTERVAL = 4500; // todo: get from config

type WorkersCache = Record<string, QueueWorker>;

export function getResolver(): GraphQLFieldResolver<any, any> {
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

  function onSubscribe(_, args, context) {
    const { queueId } = args;
    const { publish, channelName } = context;
    const manager = getQueueManager(queueId);

    // get initial values
    updateWorkersCache(manager).catch((err) => {
      logger.warn(err);
    });

    const handler = async (): Promise<void> => {
      const addedLength = added.length;
      const removedLength = removed.length;
      await updateWorkersCache(manager);

      if (added.length !== addedLength || removed.length !== removedLength) {
        return publish(channelName, { queueId: manager.id, added, removed });
      }
    };

    timer = setInterval(handler, POLLING_INTERVAL);
    timer.unref();
  }

  function onUnsubscribe(): void {
    clearInterval(timer);
  }

  return createSubscriptionResolver({
    channelName: getChannelName,
    onSubscribe,
    onUnsubscribe,
  });
}

export const onQueueWorkersChanged: FieldConfig = {
  type: schemaComposer.createObjectTC({
    description:
      'Returns the list of added and removed workers related to a queue',
    name: 'OnQueueWorkersChangedPayload',
    fields: {
      queueId: 'String!',
      added: QueueWorkerTC.List.NonNull,
      removed: QueueWorkerTC.List.NonNull,
    },
  }).NonNull,
  args: {
    queueId: 'String!',
  },
  subscribe: getResolver(),
};
