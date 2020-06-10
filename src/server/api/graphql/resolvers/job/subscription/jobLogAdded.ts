import { getQueueManager, getQueueHost } from '../../helpers';
import { debounce } from '../../../../../lib';
import { createResolver } from '../../../subscription';
import { GraphQLFieldResolver } from 'graphql';
import { KeyspaceNotificationType } from '../../../../../redis';

export function jobLogAdded(): GraphQLFieldResolver<any, any> {
  const DELAY = 250; // todo: read from config (or get from args)

  let unsub;

  function channelName(_, { queueId, jobId }): string {
    return `JOB_LOG_ADDED_${queueId}_${jobId}`;
  }

  async function onSubscribe(_, { queueId, jobId }, context) {
    const queueManager = getQueueManager(context, queueId);
    const hostManager = getQueueHost(context, queueId);
    const queue = queueManager.queue;
    const notifier = hostManager.keyspaceNotifier;
    const { channelName, pubsub } = context;

    const jobKey = queue.toKey(jobId);
    const logsKey = `${jobKey}:logs`;

    function handler(): void {
      const calls = arguments.length;
      queue.getJobLogs(jobId, -1 * calls).then((res) => {
        const { logs: rows, count } = res;
        pubsub.publish(channelName, { rows, count });
      });
    }

    const update = debounce(handler, DELAY, { maxItems: 4 });

    unsub = notifier.subscribe(
      KeyspaceNotificationType.KEYSPACE,
      logsKey,
      ({ event }) => {
        if (event === 'rpush') {
          update();
        }
      },
    );
  }

  async function onUnsubscribe(): Promise<any> {
    return unsub && unsub();
  }

  return createResolver({
    channelName,
    onSubscribe,
    onUnsubscribe,
  });
}
