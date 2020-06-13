import ms from 'ms';
import LRUCache from 'lru-cache';
import { isEmpty, isNumber } from 'lodash';
import { isFinishedStatus, diff, hashObject } from '../../../../../lib';
import { createResolver } from '../../../subscription';
import { GraphQLFieldResolver } from 'graphql';
import { getQueueListener } from '../../helpers';
import { JobStatusEnum } from '../../../../common/imports';
import { createJobNameFilter } from '../../../../../metrics/lib/utils';
import { Queue } from 'bullmq';

const EVENT_NAMES = Object.values(JobStatusEnum)
  .map((name) => `job.${name}`)
  .concat('job.removed')
  .concat('job.finished');

const DEFAULT_BATCH_INTERVAL = 150;
const MAX_AGE = 1000;

type JobDelta = {
  id: string;
  delta: Record<string, any>;
};

type ChangeBatch = {
  queue: Queue;
  changes: JobDelta[];
};

interface QueueJobChangesFilter {
  name?: string[];
  state?: JobStatusEnum[];
  attemptsMade?: number;
  batchInterval?: number;
}

type FilterPredicate = (rec: any) => boolean;

function createFilter(filterArg: QueueJobChangesFilter): FilterPredicate {
  const filters: FilterPredicate[] = [];
  if (!filterArg) return null;
  const names = filterArg.name;
  const states = filterArg.state;

  let fn: FilterPredicate;

  // filter on date. We only want realtime events
  const dateFilter = ({ timestamp }): boolean => {
    // we only want realtime events
    return !timestamp || Date.now() - timestamp < MAX_AGE;
  };

  filters.push(dateFilter);

  if (names && names.length > 0) {
    fn = createJobNameFilter(names);
    filters.push(fn);
  }

  if (states && states.length > 0) {
    if (states.length === 1) {
      const state = states[0];
      fn = ({ job }): boolean => job.state === state;
    } else {
      fn = ({ job }): boolean => states.includes(job.state);
    }
    filters.push(fn);
  }

  if (isNumber(filterArg.attemptsMade)) {
    fn = ({ job }) => job.attemptsMade >= filterArg.attemptsMade;
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

export function queueJobUpdates(): GraphQLFieldResolver<any, any> {
  const cache = new LRUCache({
    max: 2000,
    maxAge: ms('1 hour'),
  });

  let queue;

  const transform = (eventName: string, event): JobDelta => {
    const { job, latency, wait } = event;

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
    const { prevState, lastSeen, id, ...data } = delta;
    const isFinished = isFinishedStatus(eventName);
    if (isFinished) {
      cache.del(job.id);
    }
    if (!isEmpty(data)) {
      const result = data;
      result.id = job.id;
      if (!isFinished) {
        cache.set(job.id, { ...result });
      }
      return {
        id: job.id,
        delta,
      };
    }
  };

  const batchTransformer = (values: JobDelta[]): ChangeBatch => {
    // it may be possible to have multiple entries for a single id
    const map = {};
    values.forEach((delta) => {
      const prev = map[delta.id];
      if (prev) {
        // todo: mergeDeep ?
        map[delta.id] = { ...prev, ...delta };
      } else {
        map[delta.id] = delta;
      }
    });
    return {
      queue,
      changes: Object.values(values),
    };
  };

  function getChannelName(_, { input }): string {
    const { queueId, ...filter } = input;
    const hash = isEmpty(filter) ? '' : ':' + hashObject(filter);
    return `INFLIGHT_JOBS_UPDATED:${queueId}${hash}`;
  }

  // TODO: use field map to determine which fields the user requested
  // If it is one not normally returned from the queue events listener
  // we may have to read the job from redis to supply it
  function onSubscribe(_, { input }, context): AsyncIterator<any> {
    const {
      queueId,
      batchInterval = DEFAULT_BATCH_INTERVAL,
      ...filter
    } = input;
    const listener = getQueueListener(context, queueId);
    queue = listener.queue;

    const resultFilter = createFilter(filter);
    return listener.createAsyncIterator({
      eventNames: EVENT_NAMES,
      filter: resultFilter,
      transform,
      batch: {
        interval: batchInterval,
        transformer: batchTransformer,
      },
    });
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
