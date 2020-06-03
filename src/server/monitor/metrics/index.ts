import boom from '@hapi/boom';
import { ConsecutiveFailuresMetric } from './consecutiveFailuresMetric';
import { CompletedCountMetric } from './completedCountMetric';
import { FailureCountMetric } from './failureCountMetric';
import { FinishedCountMetric } from './finishedCountMetric';
import { ErrorRateMetric } from './errorRateMetric';
import { ErrorPercentageMetric } from './errorPercentageMetric';
import { JobRateMetric } from './jobRateMetric';
import { WaitTimeMetric } from './waitTimeMetric';
import { LatencyMetric } from './latencyMetric';
import { BaseMetric, MetricOptions } from './baseMetric';
import { QueueListener } from '../queues';
import { Constructor } from 'index';
export * from './peakDetector';

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

export enum MetricType {
  ConsecutiveFailures = 'ConsecutiveFailuresMetric',
  CompletedCount = 'CompletedCountMetric',
  FailureCount = 'FailureCountMetric',
  FinishedCount = 'FinishedCountMetric',
  ErrorRate = 'ErrorRateMetric',
  ErrorPercentage = 'ErrorPercentageMetric',
  JobRate = 'JobRateMetric',
  Latency = 'LatencyMetric',
  WaitTime = 'WaitTimeMetric',
}

const metricsMap = metrics.reduce((res, clazz) => {
  res.set(clazz.key, clazz);
  res.set(clazz.constructor.name, clazz);
  return res;
}, new Map<string, MetricConstructor>());

export function create(
  queueListener: QueueListener,
  type: MetricType,
  options: any,
): BaseMetric {
  const ctor = metricsMap.get(type);
  if (!ctor) {
    throw boom.badRequest(`Invalid metric type "${type}"`);
  }
  const args = [queueListener, options];
  return new ctor(...args);
}

export function getByKey(type: string): BaseMetric {
  const res = metricsMap.get(type);
  return res ? ((res as unknown) as BaseMetric) : null;
}

export function getTypes() {
  return metrics;
}

export {
  BaseMetric,
  MetricOptions,
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
