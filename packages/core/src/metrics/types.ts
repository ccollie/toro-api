import { MetricType } from './crow/metric-name';

export const Events = {
  FINISHED: 'job.finished',
  COMPLETED: 'job.completed',
  FAILED: 'job.failed',
  PROGRESS: 'job.progress',
  ACTIVE: 'job.active',
  DELAYED: 'job.delayed',
  STALLED: 'job.stalled',
};

export interface MetricFamily {
  name: string;
  type: MetricType;
  unit?: string;
  help?: string;
}
