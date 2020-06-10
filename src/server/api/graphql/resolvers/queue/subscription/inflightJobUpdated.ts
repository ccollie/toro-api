import ms from 'ms';
import LRUCache from 'lru-cache';
import { isEmpty, isDate, isNumber } from 'lodash';
import { isFinishedStatus, diff, hashObject } from '../../../../../lib';
import { createResolver } from '../../../subscription';
import { GraphQLFieldResolver } from 'graphql';
import { getQueueListener, getResolverFields } from '../../helpers';
import { createAsyncIterator, JobStatusEnum } from '../../../../common/imports';
import { createJobNameFilter } from '../../../../../metrics/lib/utils';

const EVENT_NAMES = Object.values(JobStatusEnum)
  .map((name) => `job.${name}`)
  .concat('job.removed');

type QueueJobChangesFilter = {
  name?: string[];
  state?: JobStatusEnum[];
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
    fn = createJobNameFilter(names);
    filters.push(fn);
  }

  if (states && states.length > 0) {
    fn = (rec): boolean => states.includes(rec.state);
    filters.push(fn);
  }

  if (isNumber(filterArg.attemptsMade)) {
    fn = (rec) => rec.attemptsMade >= filterArg.attemptsMade;
    filters.push(fn);
  }
  if (filters.length > 0) {
    if (filters.length === 1) {
      return filters[0];
    }
    return (rec) => {
      for (let i = 0; i < filters.length; i++) {
        if (!fn(rec)) return false;
      }
      return true;
    };
  }

  return null;
}

export function inflightJobUpdated(): GraphQLFieldResolver<any, any> {
  const cache = new LRUCache({
    max: 2000,
    maxAge: ms('1 hour'),
  });

  const MAX_AGE = 1000;
  const DATE_FIELDS = ['timestamp', 'processedOn', 'finishedOn'];

  function formatDelta(delta): any {
    DATE_FIELDS.forEach((field) => {
      const date = delta[field];
      if (isDate(date)) {
        delta[field] = date.getTime();
      }
    });
    return delta;
  }

  function getChannelName(_, { input }): string {
    const { queueId, ...filter } = input;
    const hash = isEmpty(filter) ? '' : ':' + hashObject(filter);
    return `INFLIGHT_JOBS_UPDATED:${queueId}${hash}`;
  }

  function onSubscribe(_, { input }, context, info): AsyncIterator<any> {
    const { queueId, ...filter } = input;
    const listener = getQueueListener(context, queueId);
    const fields = getResolverFields(info);
    const fieldMap = fields.reduce((res, name) => {
      res[name] = 1;
      return res;
    }, {});

    console.log(fields);

    const transformer = (eventName: string, event): any => {
      const { job, timestamp, latency, wait } = event;

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
      const { prevState, jobId, lastSeen, id, ...data } = delta;
      const isFinished = isFinishedStatus(eventName);
      if (isFinished) {
        cache.del(job.id);
      }
      if (!isEmpty(data)) {
        const result = formatDelta(data);
        result.id = job.id;
        if (!isFinished) {
          cache.set(job.id, { ...result });
        }
        return result;
      }
    };

    const resultFilter = createFilter(filter);
    return createAsyncIterator(
      listener,
      EVENT_NAMES,
      resultFilter,
      transformer,
    );
  }

  function onUnsubscribe(): void {
    cache.reset();
  }

  return createResolver({
    channelName: getChannelName,
    onSubscribe,
    onUnsubscribe,
  });
}
