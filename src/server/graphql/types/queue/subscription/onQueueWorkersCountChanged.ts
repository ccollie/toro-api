import { GraphQLFieldResolver } from 'graphql';
import { getQueueManager } from '../../../helpers';
import { logger } from '../../../../lib';
import { FieldConfig } from '../../index';
import { schemaComposer } from 'graphql-compose';
import { createSubscriptionResolver } from '../../../helpers/subscriptionManager';

const POLLING_INTERVAL = 2500; // todo: get from config

export function createResolver(): GraphQLFieldResolver<any, any> {
  let timer: NodeJS.Timeout;

  function getChannelName(_, { queueId }): string {
    return `WORKER_COUNT:${queueId}`;
  }

  function onSubscribe(_, args, context) {
    const { queueId } = args;
    const { channelName } = context;
    const manager = getQueueManager(queueId);

    let savedCount = 0;
    manager
      .getWorkerCount()
      .then((value) => {
        savedCount = value;
      })
      .catch((err) => logger.warn(err));

    const handler = async (): Promise<void> => {
      const count = await manager.getWorkerCount();
      if (count !== savedCount) {
        savedCount = count;
        return context.publish(channelName, { queueId, workersCount: count });
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

export const onQueueWorkersCountChanged: FieldConfig = {
  description: 'Returns an updated count of workers assigned to a queue',
  type: schemaComposer.createObjectTC({
    name: 'OnQueueWorkersCountPayload',
    fields: {
      queueId: 'String!',
      workersCount: 'Int!',
    },
  }),
  args: {
    queueId: 'String!',
  },
  subscribe: createResolver(),
};
