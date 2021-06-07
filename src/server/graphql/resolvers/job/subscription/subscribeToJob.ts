import { UnsubscribeFn } from 'emittery';
import { FilterFn } from 'apollo-server-express';
import { JobEventData } from '../../../../queues';
import { diff, isNumber, systemClock } from '../../../../lib';
import {
  getQueueById,
  getQueueListener,
  createSubscriptionResolver,
} from '../../../helpers';
import { GraphQLFieldResolver, GraphQLResolveInfo } from 'graphql';
import { AppJob, JobStatusEnum } from '@src/types';
import { fieldsList } from 'graphql-fields-list';
import { FieldConfig, JobTC, QueueTC } from '../../index';
import { schemaComposer } from 'graphql-compose';

export type JobData = Partial<AppJob> & {
  ts: number;
  event: string;
  waitTime?: number;
  latency?: number;
};

export function subscribeToJob(
  filter?: FilterFn,
): GraphQLFieldResolver<any, any> {
  let listenerCleanup: UnsubscribeFn;
  const clock = systemClock;
  let prevData: JobData = null;

  function transform(_: string, eventData: JobEventData): JobData {
    const { ts, job, event } = eventData;
    // we're only handling realtime events, so skip anything old
    if (clock.getTime() - ts > 1000) {
      return;
    }
    const { latency, wait } = eventData as Record<string, any>;

    let delta: JobData;

    if (!prevData) {
      delta = { ...job, event, ts };
      if (isNumber(latency)) {
        delta.latency = latency;
      }
      if (isNumber(wait)) {
        delta.waitTime = wait;
      }
    } else {
      delta = { ...diff(job, prevData, { trackRemoved: false }), event, ts };
    }
    prevData = { ...(prevData || {}), ...job, event, ts };

    return delta;
  }

  function getChannelName(_, { input }): string {
    const { queueId, id } = input;
    return `JOB_UPDATED:${queueId}${id}`;
  }

  function onSubscribe(_, { input }): AsyncIterator<any> {
    const { queueId, jobId } = input;
    const listener = getQueueListener(queueId);

    return listener.createAsyncIterator({
      eventNames: [`job.${jobId}`],
      transform,
    });
  }

  function onUnsubscribe(): void {
    listenerCleanup?.();
    listenerCleanup = null;
  }

  return createSubscriptionResolver({
    channelName: getChannelName,
    onSubscribe,
    onUnsubscribe,
    filter,
  });
}

const JobStateChangePayload = schemaComposer.createObjectTC({
  name: 'OnJobStateChangePayload',
  fields: {
    job: JobTC.NonNull,
    queue: QueueTC.NonNull,
  },
});

export function createStateSubscription(state: JobStatusEnum): FieldConfig {
  const description = `Returns job ${state} events`;
  return {
    type: JobStateChangePayload,
    description,
    args: {
      queueId: 'String!',
      jobId: 'String!',
    },
    resolve: async (_, { queueId, jobId }, ctx, info) => {
      const queue = getQueueById(queueId);
      const result = {
        queue,
      };
      if (needsJob(info)) {
        result['job'] = await queue.getJob(jobId);
      }
      return result;
    },
    subscribe: subscribeToJob((data) => data.event === state),
  };
}

export function needsJob(info: GraphQLResolveInfo): boolean {
  const fields = fieldsList(info) || [];
  return fields.includes('job');
}
