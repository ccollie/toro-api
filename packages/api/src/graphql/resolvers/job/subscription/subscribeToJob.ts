import { AppJob, JobEventData, JobStatusEnum, systemClock } from '@alpen/core';
import { diff, isNumber } from '@alpen/shared';
import { GraphQLFieldResolver, GraphQLResolveInfo } from 'graphql';
import { schemaComposer } from 'graphql-compose';
import { EZContext } from 'graphql-ez';
import { fieldsList } from 'graphql-fields-list';
import { createSharedSubscriptionResolver } from '../../../pubsub';
import { FieldConfig, JobTC, QueueTC } from '../../index';

export type JobData = Partial<AppJob> & {
  ts: number;
  event: string;
  waitTime?: number;
  latency?: number;
};

export function subscribeToJob(
  filter?: (job: any) => boolean,
): GraphQLFieldResolver<any, any> {
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
    return `JOB_UPDATED:${queueId}:${id}`;
  }

  function onSubscribe(
    _,
    { input },
    { accessors }: EZContext,
  ): AsyncIterator<any> {
    const { queueId, jobId } = input;
    const listener = accessors.getQueueListener(queueId);

    return listener.createAsyncIterator({
      eventNames: [`job.${jobId}`],
      transform,
    });
  }

  return createSharedSubscriptionResolver({
    channelName: getChannelName,
    onSubscribe,
    filter
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
    resolve: async (_, { queueId, jobId }, ctx: EZContext, info) => {
      const queue = ctx.accessors.getQueueById(queueId);
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
