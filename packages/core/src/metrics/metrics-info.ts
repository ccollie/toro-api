import { MetricFamily, MetricType } from './types';
import { AggregationType } from './aggregators/aggregation';

export const MetricAggregateByType: Record<MetricType, AggregationType[]> = {
  [MetricType.Counter]: [AggregationType.SUM],
  [MetricType.Gauge]: [
    AggregationType.LATEST,
    AggregationType.MIN,
    AggregationType.MAX,
    AggregationType.SUM,
    AggregationType.COUNT,
    AggregationType.AVG,
  ],
  [MetricType.Distribution]: [
    AggregationType.MIN,
    AggregationType.MAX,
    AggregationType.SUM,
    AggregationType.COUNT,
    AggregationType.AVG,
    // todo: percentiles
  ],
};

export const DefaultAggregationType: Record<MetricType, AggregationType> = {
  [MetricType.Gauge]: AggregationType.LATEST,
  [MetricType.Counter]: AggregationType.COUNT,
  [MetricType.Distribution]: AggregationType.SUM,
};

export const metricsInfo: MetricFamily[] = [
  {
    name: 'job_attempts',
    type: MetricType.Gauge,
    description: 'The sum of job attempts',
    unit: 'attenpts',
  },
  {
    name: 'job_avg_attempts',
    type: MetricType.Gauge,
    description: 'The average number of job attempts',
    unit: 'attempts',
  },
  {
    name: 'jobs_active',
    type: MetricType.Gauge,
    description: 'The count of jobs currently being processed',
    unit: 'jobs',
  },
  {
    name: 'jobs_completed',
    type: MetricType.Gauge,
    description: 'The count of completed',
    unit: 'jobs',
  },
  {
    name: 'jobs_failed',
    type: MetricType.Gauge,
    description: 'The count of failed jobs',
    unit: 'jobs',
  },
  {
    name: 'jobs_finished',
    type: MetricType.Gauge,
    description: 'The count of finished jobs (either failed or completed)',
    unit: 'jobs',
  },
  {
    name: 'jobs_pending',
    type: MetricType.Gauge,
    description: 'The count of pending jobs (jobs waiting to be processed)',
    unit: 'jobs',
  },
  {
    name: 'jobs_delayed',
    type: MetricType.Gauge,
    description: 'The count of delayed jobs',
    unit: 'jobs',
  },
  {
    name: 'jobs_waiting',
    type: MetricType.Gauge,
    description: 'The count of jobs in "waiting" state',
    unit: 'jobs',
  },
  {
    name: 'jobs_waiting_children',
    type: MetricType.Gauge,
    description:
      'The count of parent jobs waiting for children to be processed',
    unit: 'jobs',
  },
  {
    name: 'jobs_runtime_ms',
    type: MetricType.Distribution,
    description: 'The runtime of jobs',
    unit: 'ms',
  },
  {
    name: 'jobs_wait_time_ms',
    type: MetricType.Distribution,
    description: 'The amount of time jobs wait before being processed',
    unit: 'ms',
  },
  {
    name: 'jobs_process_time_ms',
    type: MetricType.Distribution,
    description:
      'The total amount of time jobs are in the queue (from creation to finish)',
    unit: 'ms',
  },
  {
    name: 'completed_percentage',
    type: MetricType.Gauge,
    description: 'The ratio of completed to finished jobs',
    unit: 'jobs',
  },
  {
    name: 'failed_percentage',
    type: MetricType.Gauge,
    description: 'The ratio of failed to finished jobs',
    unit: 'jobs',
  },
  {
    name: 'redis_connected_clients',
    type: MetricType.Gauge,
    description:
      'The number of clients connected to the Redis instance associated with a host',
    unit: 'clients',
  },
  {
    name: 'redis_instantaneous_ops_per_sec',
    type: MetricType.Gauge,
    description:
      'The number of instantaneous redis ops per second on the instance associated with a host',
    unit: 'jobs',
  },
  {
    name: 'redis_mem_fragmentation_ratio',
    type: MetricType.Gauge,
    description:
      'The memory fragmentation ratio of the redis instance associated with a host',
    unit: 'jobs',
  },
  {
    name: 'redis_used_memory',
    type: MetricType.Gauge,
    description:
      'The total number of bytes used  the redis instance associated with a host',
    unit: 'bytes',
  },
  {
    name: 'redis_used_memory_peak',
    type: MetricType.Gauge,
    description:
      'The peak memory consumption of the redis instance associated with a host',
    unit: 'bytes',
  },
  {
    name: 'queues',
    type: MetricType.Gauge,
    description: 'The number of queues',
    unit: 'queues',
  },
  {
    name: 'paused_queues',
    type: MetricType.Gauge,
    description: 'The number of paused queues',
    unit: 'queues',
  },
  {
    name: 'workers',
    type: MetricType.Gauge,
    description: 'The number of workers',
    unit: 'bytes',
  },
];
