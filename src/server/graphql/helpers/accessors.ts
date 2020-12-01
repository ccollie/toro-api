import {
  HostManager,
  QueueListener,
  QueueManager,
  RuleManager,
  StatsListener,
  Supervisor,
} from '../../supervisor';
import boom from '@hapi/boom';
import { Job, Queue } from 'bullmq';
import { fieldsList } from 'graphql-fields-list';
import { createAsyncIterator } from '../../lib';

export function getSupervisor(): Supervisor {
  return Supervisor.getInstance();
}

export function getHostById(id: string): HostManager {
  const host = getSupervisor().getHostById(id);
  if (!host) {
    const msg = `Host #${id} not found`;
    throw boom.notFound(msg);
  }
  return host;
}

export function getQueueById(id: string): Queue {
  return getSupervisor().getQueueById(id);
}

export async function getJobById(queueId: string, jobId: string): Promise<Job> {
  const queue = getQueueById(queueId);
  const job = await queue.getJob(jobId);
  if (!job) {
    const msg = `Job #${jobId} not found in queue "${queue.name}"`;
    throw boom.notFound(msg);
  }
  return job;
}

export function getQueueManager(queue: Queue | string): QueueManager {
  const manager = getSupervisor().getQueueManager(queue);
  if (!manager) {
    const id = typeof queue === 'string' ? queue : queue.name;
    throw boom.notFound(`Cannot find queue #${id}`);
  }
  return manager;
}

export function getQueueListener(queue: Queue | string): QueueListener {
  const manager = getQueueManager(queue);
  return manager.queueListener;
}

export function getStatsListener(queue: Queue | string): StatsListener {
  const manager = getQueueManager(queue);
  return manager.statsListener;
}

export function getResolverFields(info): string[] {
  return fieldsList(info);
}

export function getRuleManager(id: string): RuleManager {
  const manager = getQueueManager(id);
  return manager.ruleManager;
}

export function getQueueHost(queueId: string): HostManager {
  const supervisor = getSupervisor();
  const manager = supervisor.getQueueManager(queueId);
  return manager?.hostManager;
}

export function getAsyncIterator(queueId: string, eventName: string) {
  const queueEvents = getQueueListener(queueId);
  return createAsyncIterator(queueEvents, {
    eventNames: [eventName],
  });
}
