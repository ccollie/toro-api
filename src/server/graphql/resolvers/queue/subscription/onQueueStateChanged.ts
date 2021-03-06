import { createSubscriptionResolver, getQueueListener } from '../../../helpers';
import { GraphQLFieldResolver } from 'graphql';
import { QueueEventsEnum } from '@src/types';
import { FieldConfig } from '../../index';
import { schemaComposer } from 'graphql-compose';

const EventNames = Object.values(QueueEventsEnum);

function getResolver(): GraphQLFieldResolver<any, any> {
  function channelName(_, { queueId }): string {
    return `QUEUE_STATE_CHANGED:${queueId}`;
  }

  function onSubscribe(_, { queueId }): AsyncIterator<any> {
    const listener = getQueueListener(queueId);
    const queue = listener.queue;

    function transform(state): any {
      return {
        state,
        queueName: queue.name,
        queueId,
      };
    }

    return listener.createAsyncIterator({
      eventNames: EventNames,
      transform,
    });
  }

  return createSubscriptionResolver({
    channelName,
    onSubscribe,
  });
}

export const onQueueStateChanged: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'OnQueueStateChangedPayload',
    fields: {
      queueId: 'String!',
      queueName: 'String!',
      state: 'String!',
    },
  }).NonNull,
  args: {
    queueId: 'String!',
  },
  subscribe: getResolver(),
};
