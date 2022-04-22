import { MetricType } from './metric-name';
import { MetricFamily } from './types';

export const metricsInfo: MetricFamily[] = [
  {
    type: 'job_attempts',
    metricType: MetricType.Gauge,
    description: 'The sum of job attempts',
    unit: 'attenpts',
  },
  {
    type: 'job_avg_attempts',
    metricType: MetricType.Gauge,
    description: 'The average number of job attempts',
    unit: 'attempts',
  },
  {
    type: 'jobs_active',
    metricType: MetricType.Gauge,
    description: 'The count of jobs currently being processed',
    unit: 'jobs',
  },
  {
    type: 'jobs_completed',
    metricType: MetricType.Gauge,
    description: 'The count of completed',
    unit: 'jobs',
  },
  {
    type: 'jobs_failed',
    metricType: MetricType.Gauge,
    description: 'The count of failed jobs',
    unit: 'jobs',
  },
  {
    type: 'jobs_finished',
    metricType: MetricType.Gauge,
    description: 'The count of finished jobs (either failed or completed)',
    unit: 'jobs',
  },
  {
    type: 'jobs_pending',
    metricType: MetricType.Gauge,
    description: 'The count of pending jobs (jobs waiting to be processed)',
    unit: 'jobs',
  },
  {
    type: 'jobs_delayed',
    metricType: MetricType.Gauge,
    description: 'The count of delayed jobs',
    unit: 'jobs',
  },
  {
    type: 'jobs_waiting',
    metricType: MetricType.Gauge,
    description: 'The count of jobs in "waiting" state',
    unit: 'jobs',
  },
  {
    type: 'jobs_waiting_children',
    metricType: MetricType.Gauge,
    description:
      'The count of parent jobs waiting for children to be processed',
    unit: 'jobs',
  },
  {
    type: 'jobs_runtime_ms',
    metricType: MetricType.Distribution,
    description: 'The runtime of jobs',
    unit: 'ms',
  },
  {
    type: 'jobs_wait_time_ms',
    metricType: MetricType.Distribution,
    description: 'The amount of time jobs wait before being processed',
    unit: 'ms',
  },
  {
    type: 'jobs_process_time_ms',
    metricType: MetricType.Distribution,
    description:
      'The total amount of time jobs are in the queue (from creation to finish)',
    unit: 'ms',
  },
  {
    type: 'completed_percentage',
    metricType: MetricType.Gauge,
    description: 'The ratio of completed to finished jobs',
    unit: 'jobs',
  },
  {
    type: 'failed_percentage',
    metricType: MetricType.Gauge,
    description: 'The ratio of failed to finished jobs',
    unit: 'jobs',
  },
  {
    type: 'redis_connected_clients',
    metricType: MetricType.Gauge,
    description:
      'The number of clients connected to the Redis instance associated with a host',
    unit: 'clients',
  },
  {
    type: 'redis_instantaneous_ops_per_sec',
    metricType: MetricType.Gauge,
    description:
      'The number of instantaneous redis ops per second on the instance associated with a host',
    unit: 'jobs',
  },
  {
    type: 'redis_mem_fragmentation_ratio',
    metricType: MetricType.Gauge,
    description:
      'The memory fragmentation ratio of the redis instance associated with a host',
    unit: 'jobs',
  },
  {
    type: 'redis_used_memory',
    metricType: MetricType.Gauge,
    description:
      'The total number of bytes used  the redis instance associated with a host',
    unit: 'bytes',
  },
  {
    type: 'redis_used_memory_peak',
    metricType: MetricType.Gauge,
    description:
      'The peak memory consumption of the redis instance associated with a host',
    unit: 'bytes',
  },
  {
    type: 'queues',
    metricType: MetricType.Gauge,
    description: 'The number of queues',
    unit: 'queues',
  },
  {
    type: 'paused_queues',
    metricType: MetricType.Gauge,
    description: 'The number of paused queues',
    unit: 'queues',
  },
  {
    type: 'workers',
    metricType: MetricType.Gauge,
    description: 'The number of workers',
    unit: 'bytes',
  },
];
