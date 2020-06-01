import ms from 'ms';
import { throttle, isEmpty } from 'lodash';
import { diff } from '../../../../lib';
import { createSubscriptionResolver } from '../../../helpers/subscriptionManager';
import { GraphQLFieldResolver } from 'graphql';
import { JobStatusEnum, QueueEventsEnum } from '../../../imports';
import { FieldConfig } from '../../index';
import { schemaComposer } from 'graphql-compose';

const DEFAULT_COUNT_INTERVAL = ms('1.5 s');
const JOB_STATES = Object.values(JobStatusEnum);
const EVENT_NAMES = Object.values(QueueEventsEnum);

// ref: https://github.com/OptimalBits/bull/blob/develop/REFERENCE.md#global-events

function getResolver(): GraphQLFieldResolver<any, any> {
  const cleanups = [];
  let savedCounts;
  let queueManager;
  let pubsub;
  let channelName;

  async function sendCounts(): Promise<void> {
    const queue = queueManager.queue;
    const queueId = queueManager.id;
    const counts = await queueManager.getJobCounts();

    // only sendMail what changed
    const delta = diff(counts, savedCounts);
    savedCounts = counts;

    if (!isEmpty(delta)) {
      return pubsub.publish(channelName, { queueId, delta });
    }
  }

  const countHandler = throttle(async () => {
    // todo: error handling ?
    await sendCounts();
  }, DEFAULT_COUNT_INTERVAL);

  function getChannelName(_, { queueId }): string {
    return `QUEUE_JOB_COUNTS:${queueId}`;
  }

  function onSubscribe(_, args, context): void {
    const { queueId } = args;
    channelName = context.channelName;
    pubsub = context.pubsub;
    const { supervisor } = context;
    const queueManager = supervisor.getQueueById(queueId);
    const queueListener = queueManager.queueListener;
    const queue = queueManager.queue;

    EVENT_NAMES.forEach((eventName) => {
      cleanups.push(queueListener.on(eventName, countHandler));
    });

    // The cleaned event is emitted on the queue itself (i.e. not on the queue event stream)
    queue.on('cleaned', sendCounts);
    cleanups.push(() => queue.off('cleaned', sendCounts));

    JOB_STATES.forEach((eventName) => {
      cleanups.push(queueListener.on(eventName, countHandler));
    });

    // handle removed event as well
    cleanups.push(queueListener.on('removed', countHandler));
  }

  async function onUnsubscribe(): Promise<void> {
    cleanups.forEach((fn) => {
      fn();
    });
  }

  return createSubscriptionResolver({
    channelName: getChannelName,
    onSubscribe,
    onUnsubscribe,
  });
}

export const onQueueJobCountsChanged: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'OnQueueJobCountsChangedPayload',
    fields: {
      queueId: 'String!',
      delta: schemaComposer.createObjectTC({
        name: 'QueueJobCountDelta',
        fields: {
          [JobStatusEnum.COMPLETED]: 'Int',
          [JobStatusEnum.FAILED]: 'Int',
          [JobStatusEnum.DELAYED]: 'Int',
          [JobStatusEnum.ACTIVE]: 'Int',
          [JobStatusEnum.WAITING]: 'Int!',
        },
      }),
    },
  }),
  args: {
    queueId: 'String!',
  },
  subscribe: getResolver(),
};
