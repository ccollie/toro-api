import { createJobNameFilter, JOB_STATES, JobStatus } from '@alpen/core';
import { diff, hashObject } from '@alpen/shared';
import { GraphQLFieldResolver } from 'graphql';
import { schemaComposer } from 'graphql-compose';
import { EZContext } from 'graphql-ez';
import { isEmpty, isNumber } from '@alpen/shared';
import LRUCache from 'lru-cache';
import ms from 'ms';
import { createSharedSubscriptionResolver } from '../../../pubsub';
import { FieldConfig, JobType } from '../../index';

function isFinishedStatus(status: string): boolean {
  return status === 'completed' || status === 'failed';
}

const EVENT_NAMES = JOB_STATES.map((name) => `job.${name}`)
  .concat('job.removed')
  .concat('job.finished');

// todo: get from config
const DEFAULT_BATCH_INTERVAL = 250;
const MAX_AGE = 1000;

type JobDelta = {
  id: string;
  delta: Record<string, any>;
};

type ChangeBatch = {
  queueId: string;
  changes: JobDelta[];
};

interface QueueJobChangesFilter {
  names?: string[];
  states?: JobStatus[];
  attemptsMade?: number;
  batchInterval?: number;
}

type FilterPredicate = (rec: any) => boolean;

function createFilter(filterArg: QueueJobChangesFilter): FilterPredicate {
  const filters: FilterPredicate[] = [];
  if (!filterArg) return null;
  const names = filterArg.names;
  const states = filterArg.states;

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

  if (typeof (filterArg.attemptsMade) === 'number') {
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

const cache = new LRUCache({
  max: 2500,
  ttl: ms('1 hour'),
});

export function getResolver(): GraphQLFieldResolver<any, any> {
  let queue;

  function getCacheKey(job: any) {
    return queue.toKey(job.id);
  }

  const transform = (eventName: string, event): JobDelta => {
    const { job, latency, wait } = event;

    let delta;
    const key = getCacheKey(job);

    const prev = cache.get(key);
    if (!prev) {
      delta = job;
      if (isNumber(latency)) {
        delta.latency = latency;
      }
      if (isNumber(wait)) {
        delta.waitTime = wait;
      }
    } else {
      delta = diff(job, prev as Record<string, any>, { trackRemoved: false });
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { prevState, lastSeen, id, ...data } = delta;
    const isFinished = isFinishedStatus(eventName);
    if (isFinished) {
      cache.delete(key);
    }
    if (!isEmpty(data)) {
      const result = data;
      result.id = job.id;
      if (!isFinished) {
        cache.set(key, { ...result });
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
      const prev = map[delta.id] || {};
      map[delta.id] = { ...prev, ...delta };
    });
    return {
      queueId: queue.id,
      changes: Object.values(values),
    };
  };

  function getChannelName(_, { input }): string {
    const { queueId, ...filter } = input;
    const tempFilter = filter as QueueJobChangesFilter;
    if (filter) {
      if (tempFilter.names?.length) {
        tempFilter.names.sort();
      }
      if (tempFilter.states?.length) {
        tempFilter.states.sort();
      }
    }
    const hash = isEmpty(tempFilter) ? '' : ':' + hashObject(tempFilter);
    return `QUEUE_JOBS_UPDATED:${queueId}${hash}`;
  }

  // TODO: use field map to determine which fields the user requested
  // If it is one not normally returned from the queue events listener
  // we may have to read the job from redis to supply it
  function onSubscribe(
    _,
    { input },
    { accessors }: EZContext,
  ): AsyncIterator<any> {
    const {
      queueId,
      batchInterval = DEFAULT_BATCH_INTERVAL,
      ...filter
    } = input;
    const listener = accessors.getQueueListener(queueId);
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
    cache.clear();
  }

  return createSharedSubscriptionResolver({
    channelName: getChannelName,
    onSubscribe,
    onUnsubscribe,
  });
}

const JobDeltaTC = schemaComposer.createObjectTC({
  name: 'JobUpdateDelta',
  fields: {
    id: 'String!',
    delta: 'JSONObject!',
  },
});

const QueueJobUpdatesFilter = schemaComposer.createInputTC({
  name: 'QueueJobUpdatesFilterInput',
  fields: {
    queueId: 'ID!',
    names: {
      type: '[String!]',
      description: 'The job names to filter for',
    },
    states: {
      type: [JobType],
      description: 'Only return updates for jobs with these states',
    },
  },
});

export const onQueueJobUpdates: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'OnQueueJobUpdatesPayload',
    fields: {
      queueId: 'String!',
      changes: JobDeltaTC.NonNull.List.NonNull,
    },
  }).NonNull,
  args: {
    input: QueueJobUpdatesFilter.NonNull,
  },
  subscribe: getResolver(),
};
