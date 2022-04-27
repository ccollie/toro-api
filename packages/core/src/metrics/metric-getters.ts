import { HostTagKey, QueueIdTagKey, QueueTagKey } from './metric-name';
import boom from '@hapi/boom';
import { DDSketch } from '@datadog/sketches-js';
import { FinishedStatus, JobState, Queue } from 'bullmq';
import { getJobCounts } from '../loaders/job-counts';
import { round } from '@alpen/shared';
import { getRedisInfoByQueue } from '../loaders/redis-info';
import { RedisMetrics } from '../redis/utils';
import { getJobDurationValues } from '../loaders/job-duration-values';
import { AggregationType, JobDurationValuesResult, Scripts } from '../commands';
import { BiasedQuantileDistribution } from './bqdist';
import { getWorkerCount } from '../loaders/queue-workers';
import { getFilteredQueues, HostManager } from '../hosts';
import { Metric } from './metric';
import { MetricTypeName } from './types';
import { QueueFilter, QueueFilterStatus } from '../types';
import { GetterContext, Registry } from './registry';

export type MetricValueFn = (
  context: GetterContext,
  metric: Metric,
  ts?: number,
) => Promise<number | BiasedQuantileDistribution | DDSketch>;

function getHostFromContext(
  context: GetterContext,
  metric: Metric,
  required = true,
): HostManager {
  const hostName = metric.name.getTagValue(HostTagKey);
  const key = `host-${hostName}`;
  let host = context.cache.get<HostManager>(key);
  if (!host) {
    try {
      host = context.accessor.getHostById(hostName);
      context.cache.set(key, host);
    } catch (err) {
      if (required) throw err;
      return null;
    }
  }
  return host;
}

function getQueueFromContext(
  context: GetterContext,
  metric: Metric,
  required = true,
): Queue {
  // todo: cache result in context
  const key = `queue-${metric.canonicalName}`;
  let queue = context.cache.get<Queue>(key);
  if (!queue) {
    const host = getHostFromContext(context, metric, required);
    const queueName = metric.getTagValue(QueueTagKey);
    const q = host.queueManagers.find((x) => x.name === queueName);
    queue = q?.queue;
    if (!queue) {
      const id = metric.getTagValue(QueueIdTagKey);
      queue = id && host.getQueueById(id);
    }
    if (queue) {
      context.cache.set(key, queue);
    }
  }
  if (!queue && required) {
    throw boom.notFound(`Queue not found for metric "${metric.canonicalName}"`);
  }
  return queue;
}

interface HostQueueUnion {
  host?: HostManager;
  queue?: Queue;
}

function getHostOrQueueFromContext(
  context: GetterContext,
  metric: Metric,
  required = true,
): HostQueueUnion {
  const key = `hq-${metric.canonicalName}`;
  let res = context.cache.get<HostQueueUnion>(key);
  if (!res) {
    let queue: Queue;
    const host = getHostFromContext(context, metric, false);
    if (host) {
      queue = getQueueFromContext(context, metric, false);
    }
    res = {
      host,
      queue,
    };
  }
  if (required && (!res || (!res.host && !res.queue))) {
    throw boom.badData(
      'No host or queue label found in metric: ' + metric.canonicalName,
    );
  }
  return res;
}

function getRange(registry: Registry, ts: number): [number, number] {
  // ts is rounded to period, and represents the _beginning_ of the
  // new measurement interval. We need the past range
  const end = ts - 1;
  const start = ts - registry.period;
  return [start, end];
}

async function getJobCountInternal(
  context: GetterContext,
  metric: Metric,
  states: JobState | JobState[],
): Promise<number> {
  states = Array.isArray(states) ? states : [states];
  const queue = getQueueFromContext(context, metric);
  const counts = await getJobCounts(queue, states);
  return Object.values(counts).reduce(
    (res, x) => res + (Number.isFinite(x) ? x : 0),
  );
}

function finishedPercentage(status: FinishedStatus): MetricValueFn {
  return async (
    context: GetterContext,
    metric: Metric,
    ts: number,
  ): Promise<number> => {
    const queue = getQueueFromContext(context, metric);
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

function jobCount(states: JobState | JobState[]): MetricValueFn {
  return async (context: GetterContext, metric: Metric): Promise<number> => {
    return getJobCountInternal(context, metric, states);
  };
}

function attempts(
  aggregator: AggregationType,
  status: FinishedStatus = 'completed',
): MetricValueFn {
  return async (
    context: GetterContext,
    metric: Metric,
    ts?: number,
  ): Promise<number> => {
    const [start, end] = getRange(context.registry, ts);
    const jobName = metric.jobName;
    const queue = getQueueFromContext(context, metric);
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
  metric: Metric,
): Promise<number> {
  // todo: get queueOrHost
  const queue = getQueueFromContext(context, metric);
  return getWorkerCount(queue);
}

type RedisMetricField = keyof RedisMetrics;

function redisMetric(fieldName: RedisMetricField): MetricValueFn {
  return async (context: GetterContext, metric: Metric): Promise<number> => {
    // todo: get from host, not queue
    const queue = getQueueFromContext(context, metric);
    const info = await getRedisInfoByQueue(queue);
    const val = info[fieldName];
    return typeof val === 'string' ? parseInt(val, 10) : val;
  };
}

function jobDuration(valueType: keyof JobDurationValuesResult) {
  return async (
    context: GetterContext,
    metric: Metric,
    ts: number,
  ): Promise<BiasedQuantileDistribution> => {
    const [start, end] = getRange(context.registry, ts);
    const queue = getQueueFromContext(context, metric);
    const jobName = metric.jobName;
    const values = await getJobDurationValues({ queue, start, end, jobName });
    const durations = values[valueType];
    const res = new BiasedQuantileDistribution(); // todo: RelativeAccuracy
    durations.forEach(value => res.record(value));
    return res;
  };
}

function queueCount(filter?: QueueFilter): MetricValueFn {
  return async (context: GetterContext, metric: Metric): Promise<number> => {
    const host = getHostFromContext(context, metric);
    const queues = await getFilteredQueues(host, filter);
    return queues.length;
  };
}

/* eslint-disable camelcase */
export const metricGetters: Record<MetricTypeName, MetricValueFn> = {
  job_attempts: attempts('sum'),
  job_avg_attempts: attempts('avg'),
  jobs_active: jobCount('active'),
  jobs_completed: jobCount('completed'),
  jobs_delayed: jobCount('delayed'),
  jobs_failed: jobCount('failed'),
  jobs_finished: jobCount(['completed', 'failed']),
  jobs_pending: jobCount(['delayed', 'waiting']),
  jobs_waiting: jobCount('waiting'),
  jobs_waiting_children: jobCount('waiting-children'),
  jobs_runtime_ms: jobDuration('responseTime'),
  jobs_process_time_ms: jobDuration('processingTime'),
  jobs_wait_time_ms: jobDuration('waitTime'),
  completed_percentage: finishedPercentage('completed'),
  failed_percentage: finishedPercentage('failed'),
  redis_connected_clients: redisMetric('connected_clients'),
  redis_instantaneous_ops_per_sec: redisMetric('instantaneous_ops_per_sec'),
  redis_mem_fragmentation_ratio: redisMetric('mem_fragmentation_ratio'),
  redis_used_memory: redisMetric('used_memory'),
  redis_used_memory_peak: redisMetric('used_memory_peak'),
  queues: queueCount({}),
  paused_queues: queueCount({ statuses: [QueueFilterStatus.Paused] }),
  workers: queueWorkers,
};
