import { createResolver } from '../../../subscription';
import { GraphQLFieldResolver } from 'graphql';
import { QueueEventsEnum } from '../../../imports';
import { getQueueListener } from '../../helpers';

const EventNames = Object.values(QueueEventsEnum);

export function queueStateChanged(): GraphQLFieldResolver<any, any> {
  function channelName(_, { queueId }): string {
    return `QUEUE_STATE_CHANGED:${queueId}`;
  }

  function onSubscribe(_, { queueId }, context): AsyncIterator<any> {
    const listener = getQueueListener(context, queueId);
    const queue = listener.queue;

    function transform(state, event): any {
      return {
        state,
        queue,
      };
    }

    return listener.createAsyncIterator({
      eventNames: EventNames,
      transform,
    });
  }

  return createResolver({
    channelName,
    onSubscribe,
  });
}
