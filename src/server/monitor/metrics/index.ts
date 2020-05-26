import boom from '@hapi/boom';
import { CounterBasedMetricOpts } from './counterBasedMetric';
import { ConsecutiveFailuresMetric } from './consecutiveFailuresMetric';
import { CompletedCountMetric } from './completedCountMetric';
import { FailureCountMetric } from './failureCountMetric';
import { FinishedCountMetric } from './finishedCountMetric';
import { ErrorRateMetric } from './errorRateMetric';
import { ErrorPercentageMetric } from './errorPercentageMetric';
import { JobRateMetric } from './jobRateMetric';
import { WaitTimeMetric } from './waitTimeMetric';
import { LatencyMetric } from './latencyMetric';
import { BaseMetric } from './baseMetric';
import { QueueListener } from '../queues';
import { ObjectSchema } from '@hapi/joi';
import { Constructor } from 'index';

const metrics = [
  ConsecutiveFailuresMetric,
  CompletedCountMetric,
  FailureCountMetric,
  FinishedCountMetric,
  ErrorRateMetric,
  ErrorPercentageMetric,
  JobRateMetric,
  LatencyMetric,
  WaitTimeMetric,
];

type MetricConstructor = Constructor<BaseMetric>;

const metricsMap = metrics.reduce((res, clazz) => {
  res.set(clazz.key, clazz);
  res.set(clazz.constructor.name, clazz);
  return res;
}, new Map<string, MetricConstructor>());

export function create(
  queueListener: QueueListener,
  type: string,
  options: any,
): BaseMetric {
  const ctor = metricsMap.get(type);
  if (!ctor) {
    throw boom.badRequest(`Invalid metric type "${type}"`);
  }
  const schema = (ctor as any).schema as ObjectSchema;
  const args = [queueListener];
  if (schema) {
    const { error, value } = schema.validate(options);
    if (error) {
      throw error;
    }
    args.push(value);
  }

  return new ctor(...args);
}

export function getByKey(type: string): MetricConstructor {
  return metricsMap.get(type);
}

export function getTypes() {
  return metrics;
}

export {
  BaseMetric,
  CounterBasedMetricOpts,
  ConsecutiveFailuresMetric,
  FailureCountMetric,
  CompletedCountMetric,
  FinishedCountMetric,
  ErrorRateMetric,
  JobRateMetric,
  ErrorPercentageMetric,
  LatencyMetric,
  WaitTimeMetric,
};
