import { debounce, getKeyspaceNotifier, releaseKeyspaceNotifier, UnsubscribeFn } from '@alpen/core';
import { GraphQLFieldResolver } from 'graphql';
import { schemaComposer } from 'graphql-compose';
import { EZContext } from 'graphql-ez';
import { fieldsList } from 'graphql-fields-list';
import { createSharedSubscriptionResolver } from '../../../pubsub';
import { FieldConfig, JobTC } from '../../index';

function getResolver(): GraphQLFieldResolver<any, any> {
  const DELAY = 250; // todo: read from config (or get from args)

  let unsub: UnsubscribeFn;
  let hostId: string;

  function channelName(_, { queueId, jobId }): string {
    return `JOB_LOG_ADDED_${queueId}_${jobId}`;
  }

  function onSubscribe(_, { queueId, jobId }, context: EZContext) {
    const queueManager = context.accessors.getQueueManager(queueId);
    const hostManager = context.accessors.getQueueHost(queueId);
    const queue = queueManager.queue;
    const { channelName, pubsub } = context;
    const jobKey = queue.toKey(jobId);
    const logsKey = `${jobKey}:logs`;

    hostId = hostManager.id;
    const notifier = getKeyspaceNotifier(hostId);

    async function handler(): Promise<void> {
      const added = arguments.length;
      return pubsub.publish(channelName, { queueId, jobId, added });
    }

    const update = debounce(handler, DELAY, { maxItems: 4 });

    unsub = notifier.subscribeKey(logsKey, ({ event }) => {
      if (event === 'rpush') {
        update();
      }
    });
  }

  async function onUnsubscribe(): Promise<any> {
    releaseKeyspaceNotifier(hostId);
    return unsub && unsub();
  }

  return createSharedSubscriptionResolver({
    channelName,
    onSubscribe,
    onUnsubscribe,
  });
}

export const onJobLogAdded: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'OnJobLogAddedPayload',
    fields: {
      job: JobTC.NonNull,
      queueId: 'String!',
      jobId: 'String!',
      rows: {
        type: '[String!]!',
        description: 'The rows added to the job log',
      },
      count: {
        type: 'Int!',
        description: 'The number of log lines after addition',
      },
    },
  }).NonNull,
  args: {
    queueId: 'String!',
    jobId: 'String!',
  },
  resolve: async ({ added }, { queueId, jobId }, ctx: EZContext, info) => {
    const queue = ctx.accessors.getQueueById(queueId);
    const fields = fieldsList(info);
    const needsCount = fields.includes('count');
    const needsJob = fields.includes('job');
    const needsRows = fields.includes('rows');

    const result = {
      queue,
      queueId,
      jobId,
    };

    if (needsRows || needsCount) {
      const { logs, count } = await queue.getJobLogs(jobId, -1 * added);
      result['count'] = count;
      result['rows'] = logs;
    }

    if (needsJob) {
      result['job'] = await queue.getJob(jobId);
    }
    return result;
  },
  subscribe: getResolver,
};
