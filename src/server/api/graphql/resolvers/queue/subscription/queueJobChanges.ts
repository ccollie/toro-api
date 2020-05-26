import ms from 'ms';
import LRUCache from 'lru-cache';
import { isEmpty, isDate, isNumber } from 'lodash';
import { isFinishedStatus, JOB_STATES, diff } from '../../../../../lib';
import { createResolver } from '../../../subscription';
import { GraphQLFieldResolver } from 'graphql';
import { getQueueListener } from '../../helpers';
import { JobStatus } from '../../../../common/imports';

// ref: https://github.com/OptimalBits/bull/blob/develop/REFERENCE.md#global-events

type QueueJobChangesFilter = {
  name?: string[];
  state?: JobStatus[];
  attemptsMade?: number;
};

type FilterPredicate = (rec: any) => boolean;

type QueueJobUpdateMessage = {
  id: string;
  state: string;
  timestamp: number;
  progress?: any;
  finishedOn?: number;
  processedOn?: number;
};

function createFilter(filterArg: QueueJobChangesFilter): FilterPredicate {
  const filters: FilterPredicate[] = [];
  if (!filterArg) return null;
  const names = filterArg.name;
  const states = filterArg.state;

  let fn: FilterPredicate;

  if (names && names.length > 0) {
    fn = (rec) => names.includes(rec.name);
    filters.push(fn);
  }

  if (states && states.length > 0) {
    fn = (rec) => states.includes(rec.state);
    filters.push(fn);
  }

  if (isNumber(filterArg.attemptsMade)) {
    fn = (rec) => rec.attemptsMade >= filterArg.attemptsMade;
    filters.push(fn);
  }
  if (filters.length > 0) {
    return (rec) => {
      for (let i = 0; i < filters.length; i++) {
        if (!fn(rec)) return false;
      }
      return true;
    };
  }

  return null;
}

export function queueJobChanges(): GraphQLFieldResolver<any, any> {
  const cache = new LRUCache({
    max: 2000,
    maxAge: ms('1 hour'),
  });

  const MAX_AGE = 1000;

  const DATE_FIELDS = ['timestamp', 'processedOn', 'finishedOn'];
  let resultFilter: FilterPredicate = null;

  function formatDelta(delta): any {
    DATE_FIELDS.forEach((field) => {
      const date = delta[field];
      if (isDate(date)) {
        delta[field] = date.getTime();
      }
    });
    return delta;
  }

  function getChannelName(_, { queueId }): string {
    return `QUEUE_JOBS_UPDATED:${queueId}`;
  }

  const cleanups = [];

  function onSubscribe(_, { queueId, filter }, context): void {
    const listener = getQueueListener(context, queueId);
    const { channelName, pubsub } = context;

    const handler = (eventName: string, arg): void => {
      const { job, timestamp, latency, wait } = arg;

      // we only want realtime events
      if (Date.now() - timestamp > MAX_AGE) {
        return;
      }
      let delta;
      const prev = cache.get(job.id);
      if (!prev) {
        delta = job;
        if (isNumber(latency)) {
          delta.latency = latency;
        }
        if (isNumber(wait)) {
          delta.waitTime = wait;
        }
      } else {
        delta = diff(job, prev, { trackRemoved: false });
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { prevState, jobId, lastSeen, id, ...rest } = delta;
      if (!isEmpty(rest)) {
        const result = formatDelta(rest);
        result.id = job.id;
        cache.set(job.id, { ...result });
        pubsub.publish(channelName, result);
      }
      if (isFinishedStatus(eventName)) {
        cache.del(job.id);
      }
    };

    JOB_STATES.forEach((eventName) => {
      const cb = (data) => {
        handler(eventName, data);
      };
      const actualEventName = `job.${eventName}`;
      cleanups.push(listener.on(actualEventName, cb));
    });

    resultFilter = createFilter(filter);
  }

  function onUnsubscribe(): void {
    cleanups.forEach((fn) => {
      fn();
    });
    cache.reset();
  }

  return createResolver({
    channelName: getChannelName,
    filter: resultFilter,
    onSubscribe,
    onUnsubscribe,
  });
}
