import boom from '@hapi/boom';
import { Queue, Job } from 'bullmq';
import {
  QueueManager,
  QueueListener,
  Supervisor,
  HostManager,
  StatsClient,
  StatsGranularity,
} from '../../common/imports';

import { endOf, parseDate, startOf, subtract } from '../../../lib/datetime';
import { systemClock } from '../../../lib/clock';
import getFieldNames from 'graphql-list-fields';

export function getSupervisor(context): Supervisor {
  return context.supervisor as Supervisor;
}

export function getQueueById(context, id: string): Queue {
  return getSupervisor(context).getQueueById(id);
}

export async function getJobById(context, queueId, jobId): Promise<Job> {
  const queue = getQueueById(context, queueId);
  const job = await queue.getJob(jobId);
  if (!job) {
    const msg = `Job #${jobId} not found in queue "${queue.name}"`;
    throw boom.notFound(msg);
  }
  return job;
}

export function getQueueManager(context, id: string): QueueManager {
  return getSupervisor(context).getQueueManager(id);
}

export function getQueueHost(context, queueId: string): HostManager {
  const supervisor = getSupervisor(context);
  const manager = supervisor.getQueueManager(queueId);
  return supervisor.getHost(manager && manager.host);
}

export function getQueueListener(context, id: string): QueueListener {
  const manager = getQueueManager(context, id);
  return manager && manager.queueListener;
}

export function getStatsClient(context, id: string): StatsClient {
  const manager = getQueueManager(context, id);
  return manager && manager.statsClient;
}

export function normalizeGranularity(granularity: string): StatsGranularity {
  return (granularity
    ? granularity.toLowerCase()
    : granularity) as StatsGranularity;
}

export function getResolverFields(info): string[] {
  return getFieldNames(info);
}

export function parseRangeQuery(options: any = {}, unit?: StatsGranularity) {
  let { start, end } = options;
  const now = systemClock.now();
  unit = unit || StatsGranularity.Hour;
  if (start && end) {
    return { start, end };
  } else if (!start && !end) {
    end = endOf(now, unit);
    start = startOf(end, unit);
  } else if (start) {
    start = parseDate(start, now);
    end = endOf(start, unit);
  } else {
    end = parseDate(end, now);
    start = subtract(end, 1, unit);
  }
  return { start, end };
}
