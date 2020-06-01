import {
  getQueueManager,
  getQueueHost,
  getQueueById,
  createSubscriptionResolver
} from '../../../helpers';
import { debounce } from '../../../../lib';
import { GraphQLFieldResolver } from 'graphql';
import {
  getKeyspaceNotifier,
  releaseKeyspaceNotifier,
} from '../../../../redis/keyspace-utils';
import { FieldConfig, JobTC } from '../../index';
import { fieldsList } from 'graphql-fields-list';
import { schemaComposer } from 'graphql-compose';

function getResolver(): GraphQLFieldResolver<any, any> {
  const DELAY = 250; // todo: read from config (or get from args)

  let unsub;
  let hostId: string;

  function channelName(_, { queueId, jobId }): string {
    return `JOB_LOG_ADDED_${queueId}_${jobId}`;
  }

  function onSubscribe(_, { queueId, jobId }, context, info) {
    const queueManager = getQueueManager(queueId);
    const hostManager = getQueueHost(queueId);
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

    notifier
      .subscribeKey(logsKey, ({ event }) => {
        if (event === 'rpush') {
          update();
        }
      })
      .then((fn) => {
        unsub = fn;
      });
  }

  async function onUnsubscribe(): Promise<any> {
    releaseKeyspaceNotifier(hostId);
    return unsub && unsub();
  }

  return createSubscriptionResolver({
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
  }),
  args: {
    queueId: 'String!',
    jobId: 'String!',
  },
  resolve: async ({ added }, { queueId, jobId }, ctx, info) => {
    const queue = await getQueueById(queueId);
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
