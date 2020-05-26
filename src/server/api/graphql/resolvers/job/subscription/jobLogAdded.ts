import { getQueueManager, getQueueHost } from '../../helpers';
import { createResolver } from '../../../subscription';
import { GraphQLFieldResolver } from 'graphql';

export function jobLogAdded(): GraphQLFieldResolver<any, any> {
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

    function handler({ event }): void {
      if (event === 'rpush') {
        queue.getJobLogs(jobId, -1).then((res) => {
          pubsub.publish(channelName, { jobId, logs: res.logs });
        });
      }
    }

    unsub = notifier.subscribe('keyspace', logsKey, handler);
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
