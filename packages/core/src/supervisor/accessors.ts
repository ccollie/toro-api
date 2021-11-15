import * as boom from '@hapi/boom';
import { Job, Queue } from 'bullmq';
import { StatsClient, StatsListener } from '../stats';
import { QueueManager, QueueListener } from '../queues';
import { Supervisor } from './supervisor';
import { HostManager } from '../hosts/host-manager';
import { BaseMetric } from '../metrics/baseMetric';
import { RuleManager } from '../rules/rule-manager';
import { createAsyncIterator } from '../lib';

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

export function getQueueById(id: string, mutation?: string | boolean): Queue {
  const manager = getQueueManager(id, mutation);
  return manager?.queue;
}

export function getQueueId(queue: Queue): string {
  return getSupervisor().getQueueId(queue);
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

export async function getJobById(
  queueId: string,
  jobId: string,
  mutation?: string | boolean,
): Promise<Job> {
  const queue = getQueueById(queueId, mutation);
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

export function raiseIfQueueIsReadonly(
  q: QueueManager | Queue | string,
  mutation?: string,
) {
  let manager: QueueManager | null = null;
  if (typeof q === 'string' || q instanceof Queue) {
    manager = getSupervisor().getQueueManager(q);
  } else {
    manager = q;
  }
  const name = manager?.queue.name;
  const opName = mutation || 'modify queue';
  const message = `Queue ${name} is read-only (${opName})`;
  throw boom.forbidden(message, { name: 'AlpenError' });
}

function validateQueueReadonly(
  q: QueueManager | Queue | string,
  mutation?: string | boolean,
) {
  if (mutation === undefined || mutation === false) return;
  const opName = typeof mutation === 'string' ? mutation : undefined;
  return raiseIfQueueIsReadonly(q, opName);
}

export function getQueueManager(
  queue: Queue | string,
  mutation?: string | boolean,
): QueueManager {
  const manager = getSupervisor().getQueueManager(queue);
  if (!manager) {
    const id = typeof queue === 'string' ? queue : queue.name;
    throw boom.notFound(`Cannot find queue #${id}`, { name: 'AlpenError' });
  }
  validateQueueReadonly(manager, mutation);
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

export function getQueueRuleManager(
  queueId: Queue | string,
  mutation?: string | boolean,
): RuleManager {
  const manager = getQueueManager(queueId, mutation);
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
