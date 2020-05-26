import ms from 'ms';
import { throttle, isEmpty } from 'lodash';
import { diff } from '../../../../../lib';
import { JOB_STATES, QUEUE_BASED_EVENTS } from '../../../../../lib/consts';
import { createResolver } from '../../../subscription';
import { GraphQLFieldResolver } from 'graphql';

const DEFAULT_COUNT_INTERVAL = ms('1.5 s');

// ref: https://github.com/OptimalBits/bull/blob/develop/REFERENCE.md#global-events

export function jobCountsChanged(): GraphQLFieldResolver<any, any> {
  const cleanups = [];
  let savedCounts;
  let queueManager;
  let pubsub;
  let channelName;

  async function sendCounts(): Promise<void> {
    const counts = await queueManager.getJobCounts();

    // only send what changed
    const delta = diff(counts, savedCounts);
    savedCounts = counts;

    if (!isEmpty(delta)) {
      return pubsub.publish(channelName, { counts: delta });
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

    QUEUE_BASED_EVENTS.forEach((eventName) => {
      cleanups.push(queueListener.on(eventName, countHandler));
    });

    // The cleaned event is emitted on the queue itself (i.e. not on the queue event stream)
    queue.on('cleaned', sendCounts);
    cleanups.push(() => queue.off('cleaned', sendCounts));

    JOB_STATES.forEach((eventName) => {
      cleanups.push(queueListener.on(eventName, countHandler));
    });
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
