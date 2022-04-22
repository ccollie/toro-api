import {
  HostTagKey,
  MetricName,
  MetricType,
  QueueIdTagKey,
  QueueTagKey,
} from './crow/metric-name';
import boom from '@hapi/boom';
import { FinishedStatus, JobState, Queue } from 'bullmq';
import { getJobCounts } from '../loaders/job-counts';
import { round } from '@alpen/shared';
import { getRedisInfoByQueue } from '../loaders/redis-info';
import { RedisMetrics } from '../redis/utils';
import { getJobDurationValues } from '../loaders/job-duration-values';
import { AggregationType, JobDurationValuesResult, Scripts } from '../commands';
import { BiasedQuantileDistribution } from './crow/bqdist';
import { getWorkerCount } from '../loaders/queue-workers';
import { Registry } from './crow/registry';
import { IAccessorHelper } from '../loaders/accessors';
import { HostManager } from '../hosts';
import LRUCache from 'lru-cache';

export type JobMetricTypeName =
  | 'job_attempts_made'
  | 'job_avg_attempts'
  | 'jobs_active'
  | 'jobs_waiting'
  | 'jobs_completed'
  | 'jobs_failed'
  | 'completed_percentage'
  | 'failed_percentage'
  | 'jobs_delayed'
  | 'jobs_pending'
  | 'jobs_waiting_children'
  | 'jobs_runtime_ms'
  | 'jobs_finished'
  | 'jobs_wait_time_ms'
  | 'jobs_process_time_ms';

export type QueueMetricTypeName = 'workers';

export type HostMetricTypeName = 'queues' | 'paused_queues' | 'workers';

export type RedisMetricTypeMame =
  | 'redis_used_memory'
  | 'redis_connected_clients'
  | 'redis_used_memory_peak'
  | 'redis_mem_fragmentation_ratio'
  | 'redis_instantaneous_ops_per_sec';

export type MetricTypeName =
  | RedisMetricTypeMame
  | JobMetricTypeName
  | QueueMetricTypeName;

export interface GetterContext {
  registry: Registry;
  accessor: IAccessorHelper;
  cache: LRUCache<string, any>;
}

type GetQueueValueFn = (
  context: GetterContext,
  queue: Queue,
  ts?: number,
) => Promise<number | BiasedQuantileDistribution>;

function getHostFromContext(
  context: GetterContext,
  name: MetricName,
): HostManager {
  const hostName = name.getTagValue(HostTagKey);
  return context.accessor.getHostById(hostName);
}

function getQueueFromContext(context: GetterContext, name: MetricName): Queue {
  // todo: cache result in context
  const host = getHostFromContext(context, name);
  const queueName = name.getTagValue(QueueTagKey);
  const q = host.queueManagers.find((x) => x.name === queueName);
  let queue = q?.queue;
  if (!queue) {
    const id = name.getTagValue(QueueIdTagKey);
    queue = id && host.getQueueById(id);
  }
  if (!queue) {
    throw boom.notFound(`Queue not found for metric "${name.canonical}"`);
  }
  return queue;
}

function getRange(ts: number, period: number): [number, number] {
  // ts is rounded to period, and represents the _beginning_ of the
  // new measurement interval. We need the past range
  const end = ts - 1;
  const start = ts - period;
  return [start, end];
}

async function getJobCountInternal(
  context: GetterContext,
  queue: Queue,
  states: JobState | JobState[],
): Promise<number> {
  states = Array.isArray(states) ? states : [states];
  const counts = await getJobCounts(queue, states);
  return Object.values(counts).reduce(
    (res, x) => res + (Number.isFinite(x) ? x : 0),
  );
}

function finishedPercentage(status: FinishedStatus): GetQueueValueFn {
  return async (
    context: GetterContext,
    queue: Queue,
    ts: number,
  ): Promise<number> => {
    const counts = await getJobCounts(queue, ['completed', 'failed']);
    const completed = counts['completed'] || 0;
    const failed = counts['failed'] || 0;
    const total = completed + failed;
    const numerator = status === 'completed' ? completed : failed;
    if (total > 0) {
      const value = numerator / total;
      return round(value, 2) * 100;
    }
    return 0;
  };
}

function jobCount(states: JobState | JobState[]): GetQueueValueFn {
  return async (context: GetterContext, queue: Queue): Promise<number> => {
    return getJobCountInternal(context, queue, states);
  };
}

function attempts(
  aggregator: AggregationType,
  status: FinishedStatus = 'completed',
): GetQueueValueFn {
  return async (
    context: GetterContext,
    queue: Queue,
    ts?: number,
  ): Promise<number> => {
    const [start, end] = getRange(ts, 60000); // todo;
    const jobName = '';
    return Scripts.getJobAttemptsInRange(
      queue,
      status,
      start,
      end,
      jobName,
      aggregator,
    );
  };
}

async function queueWorkers(
  context: GetterContext,
  queue: Queue,
): Promise<number> {
  return getWorkerCount(queue);
}

type RedisMetricField = keyof RedisMetrics;

function redisMetric(fieldName: RedisMetricField): GetQueueValueFn {
  return async (context: GetterContext, queue: Queue): Promise<number> => {
    const info = await getRedisInfoByQueue(queue);
    const val = info[fieldName];
    return typeof val === 'string' ? parseInt(val, 10) : val;
  };
}

function jobDuration(valueType: keyof JobDurationValuesResult) {
  return async (
    context: GetterContext,
    queue: Queue,
    ts: number,
  ): Promise<BiasedQuantileDistribution> => {
    const [start, end] = getRange(ts, 60000); // todo;
    const values = await getJobDurationValues({ queue, start, end });
    const durations = values[valueType];
    const distribution = new BiasedQuantileDistribution();
    durations.forEach((value) => distribution.record(value));
    return distribution;
  };
}

function queues(context: GetterContext, name: MetricName): Promise<number> {}

/* eslint-disable camelcase */
const getters: Record<MetricTypeName, GetQueueValueFn> = {
  job_attempts_made: attempts('sum'),
  job_avg_attempts: attempts('avg'),
  jobs_active: jobCount('active'),
  jobs_completed: jobCount('completed'),
  jobs_delayed: jobCount('delayed'),
  completed_percentage: finishedPercentage('completed'),
  failed_percentage: finishedPercentage('failed'),
  jobs_failed: jobCount('failed'),
  jobs_finished: jobCount(['completed', 'failed']),
  jobs_pending: jobCount(['delayed', 'waiting']),
  jobs_waiting: jobCount('waiting'),
  jobs_waiting_children: jobCount('waiting-children'),
  jobs_runtime_ms: jobDuration('responseTime'),
  jobs_process_time_ms: jobDuration('processingTime'),
  jobs_wait_time_ms: jobDuration('waitTime'),
  redis_connected_clients: redisMetric('connected_clients'),
  redis_instantaneous_ops_per_sec: redisMetric('instantaneous_ops_per_sec'),
  redis_mem_fragmentation_ratio: redisMetric('mem_fragmentation_ratio'),
  redis_used_memory: redisMetric('used_memory'),
  redis_used_memory_peak: redisMetric('used_memory_peak'),
  workers: queueWorkers,
};

export interface MetricMetadata {
  type: MetricTypeName;
  metricType: MetricType;
  description: string;
  collect: GetQueueValueFn;
}
