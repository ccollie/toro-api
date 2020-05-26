import { QUEUE_BASED_EVENTS } from '../../../../../lib';
import { createResolver } from '../../../subscription';
import { GraphQLFieldResolver } from 'graphql';

// ref: https://github.com/OptimalBits/bull/blob/develop/REFERENCE.md#global-events

export function queueStateChanged(): GraphQLFieldResolver<any, any> {
  const cleanups = [];

  function getChannelName(_, { queueId }): string {
    return `QUEUE_STATE_CHANGED:${queueId}`;
  }

  function onSubscribe(_, args, context): void {
    const { queueId } = args;
    const { channelName, pubsub, supervisor } = context;
    const queueManager = supervisor.getQueueById(queueId);
    const { queue, queueListener } = queueManager;

    function handler(event): Promise<void> {
      return pubsub.publish(channelName, { event, queueId });
    }

    QUEUE_BASED_EVENTS.forEach((eventName) => {
      cleanups.push(queueListener.on(eventName, () => handler(eventName)));
    });

    // The cleaned event is emitted on the queue itself (i.e. not on the queue event stream)
    // TODO: we need a global event, otherwise its visible only on the current node.
    // Maybe emit in the mutation
    const handleCleaned = () => {
      handler('cleaned').catch((err) => console.log(err));
    };

    queue.on('cleaned', handleCleaned);
    cleanups.push(() => queue.off('cleaned', handleCleaned));
  }

  async function onUnsubscribe(): Promise<void> {
    cleanups.forEach((fn) => {
      fn();
    });
  }

  return createResolver({
    channelName: getChannelName,
    onSubscribe,
    onUnsubscribe,
  });
}
