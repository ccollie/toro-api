import { createResolver } from '../../../subscription';
import { GraphQLFieldResolver } from 'graphql';
import { getQueueManager } from '../../helpers';

const POLLING_INTERVAL = 4500; // todo: get from config

export function workersCountChanged(): GraphQLFieldResolver<any, any> {
  let timer: NodeJS.Timeout;

  function getChannelName(_, { queueId }): string {
    return `WORKER_COUNT:${queueId}`;
  }

  async function onSubscribe(_, args, context) {
    const { queueId } = args;
    const { pubsub, channelName } = context;
    const manager = getQueueManager(context, queueId);

    let savedCount = await manager.getWorkerCount();

    const handler = async (): Promise<void> => {
      const count = await manager.getWorkerCount();
      if (count !== savedCount) {
        savedCount = count;
        return pubsub.publish(channelName, { count });
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
