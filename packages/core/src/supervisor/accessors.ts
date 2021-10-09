import boom from '@hapi/boom';
import { Job, Queue } from 'bullmq';
import { StatsClient } from '../stats/stats-client';
import { fieldsList } from 'graphql-fields-list';
import { GraphQLResolveInfo } from 'graphql';
import { QueueManager } from '../queues/queue-manager';
import { QueueListener } from '../queues/queue-listener';
import { Supervisor } from './supervisor';
import { HostManager } from '../hosts/host-manager';
import { BaseMetric } from '../metrics/baseMetric';
import { StatsListener } from '../stats';
import { RuleManager } from '../rules/rule-manager';
import { createAsyncIterator } from '../lib';

const queueIdMap = new WeakMap<Queue, string>();

export function getQueueNameKey(manager: QueueManager): string {
  const queue = manager.queue;
  return `${manager.prefix}:${queue.name}`;
}

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

export function getHost(id: string): HostManager {
  const supervisor = getSupervisor();
  let host = supervisor.getHostById(id);
  if (!host) {
    host = supervisor.hosts.find((x) => x.name === id);
  }
  if (!host) {
    const msg = `Host "${id}" not found`;
    throw boom.notFound(msg);
  }
  return host;
}

export function getQueueById(id: string): Queue {
  return getSupervisor().getQueueById(id);
}

export function getQueueId(queue: Queue): string {
  let id = queueIdMap.get(queue);
  if (!id) {
    const hosts = getSupervisor().hosts;
    for (let i = 0; i < hosts.length; i++) {
      const managers = hosts[i].queueManagers;
      for (let j = 0; j < managers.length; j++) {
        const manager = managers[j];
        if (queue === manager.queue) {
          id = manager.id;
          queueIdMap.set(queue, id);
          return id;
        }
        // do useful work
        if (!queueIdMap.get(manager.queue)) {
          queueIdMap.set(manager.queue, manager.id);
        }
      }
    }
  }
  return id;
}

export function getMetricById(id: string): BaseMetric {
  const hosts = getSupervisor().hosts;
  for (let i = 0; i < hosts.length; i++) {
    const managers = hosts[i].queueManagers;
    for (let j = 0; j < managers.length; j++) {
      const manager = managers[j];
      const metric = manager.metricManager.findMetricById(id);
      if (metric) return metric;
    }
  }
  return null;
}

export async function getJobById(queueId: string, jobId: string): Promise<Job> {
  const queue = getQueueById(queueId);
  // todo: maybe use loader here
  const job = await queue.getJob(jobId);
  if (!job) {
    const msg = `Job #${jobId} not found in queue "${queue.name}"`;
    throw boom.notFound(msg);
  }
  return job;
}

export function getJobQueue(job: Job): Queue {
  let queue = (job as any).queue as Queue;
  if (!queue) {
    const queueId = (job as any).queueId;
    queue = getQueueById(queueId);
  }
  if (!queue) {
    const msg = `No queue found for Job ${job.name}#${job.id}`;
    throw boom.notFound(msg);
  }
  return queue;
}

export function getQueueHostManager(queue: Queue | string): HostManager {
  const manager = getQueueManager(queue);
  return manager.hostManager;
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

export function getResolverFields(info: GraphQLResolveInfo): string[] {
  return fieldsList(info);
}

export function getQueueRuleManager(queueId: Queue | string): RuleManager {
  const manager = getQueueManager(queueId);
  return manager.ruleManager;
}

export function getQueueHost(queueId: Queue | string): HostManager {
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

export function getStatsClient(queue: string | Queue): StatsClient {
  const manager = getQueueManager(queue);
  return manager && manager.statsClient;
}
