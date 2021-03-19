import boom from '@hapi/boom';
import { ConsecutiveFailuresMetric } from './consecutiveFailuresMetric';
import { CompletedCountMetric } from './completedCountMetric';
import { CompletedRateMetric } from './completedRateMetric';
import { FailedCountMetric } from './failedCountMetric';
import { FinishedCountMetric } from './finishedCountMetric';
import { ErrorRateMetric } from './errorRateMetric';
import { ErrorPercentageMetric } from './errorPercentageMetric';
import { JobRateMetric } from './jobRateMetric';
import { WaitTimeMetric } from './waitTimeMetric';
import { LatencyMetric } from './latencyMetric';
import { BaseMetric, PollingMetric } from './baseMetric';
import { UsedMemoryMetric, ConnectedClientsMetric } from './redisMetrics';
import {
  CurrentActiveCountMetric,
  CurrentCompletedCountMetric,
  CurrentDelayedCountMetric,
  CurrentFailedCountMetric,
  CurrentWaitingCountMetric,
} from './jobSpotCountMetric';
import { Constructor, RuleType, MetricOptions } from '@src/types';
import { createAggregator } from './aggregators';
import { Clock, hashObject, titleCase } from '../lib';
import { ApdexMetric, ApdexMetricOptions } from './apdexMetric';

export * from './constants';
export * from './metricsListener';
export * from './sliding-window-counter';

const metrics = [
  ApdexMetric,
  ConnectedClientsMetric,
  ConsecutiveFailuresMetric,
  CompletedCountMetric,
  CompletedRateMetric,
  ErrorRateMetric,
  ErrorPercentageMetric,
  FailedCountMetric,
  FinishedCountMetric,
  JobRateMetric,
  LatencyMetric,
  UsedMemoryMetric,
  WaitTimeMetric,
  CurrentActiveCountMetric,
  CurrentCompletedCountMetric,
  CurrentDelayedCountMetric,
  CurrentFailedCountMetric,
  CurrentWaitingCountMetric,
];

export type MetricConstructor = Constructor<BaseMetric>;

export enum MetricTypeEnum {
  Apdex,
  ConnectedClients,
  ConsecutiveFailures,
  CompletedCount,
  CompletedRate,
  CurrentActiveCount,
  CurrentCompletedCount,
  CurrentDelayedCount,
  CurrentFailedCount,
  CurrentWaitingCount,
  ErrorRate,
  ErrorPercentage,
  FailureCount,
  FinishedCount,
  JobRate,
  Latency,
  UsedMemory,
  WaitTime,
}

export const metricsMap = metrics.reduce((res, clazz) => {
  res.set(clazz.key, clazz);
  return res;
}, new Map<string, MetricConstructor>());

export function getMetricByKey(
  type: string | MetricTypeEnum,
): MetricConstructor {
  let ctor: MetricConstructor;
  if (typeof type === 'string') {
    ctor = metricsMap.get(type);
    if (!ctor) {
      if (!type.endsWith('Metric')) {
        type = titleCase(type) + 'Metric';
      }
      const ctors = Array.from(metricsMap.values());
      ctor = ctors.find((v) => v.name === type);
    }
  } else {
    ctor = metrics[type];
  }
  return ctor;
}

export function createMetric(
  type: string | MetricTypeEnum,
  options: Record<string, any>,
): BaseMetric {
  const ctor = getMetricByKey(type);
  if (!ctor) {
    throw boom.badRequest(`Invalid metric type "${type}"`);
  }
  const args = [options];
  return new ctor(...args);
}

export function createMetricFromJSON(
  clock: Clock,
  json: Record<string, any>,
): BaseMetric {
  const { type, options, aggregator: aggOptions } = json as Record<string, any>;
  const metric = createMetric(type, options);

  if (aggOptions) {
    const { type, options } = aggOptions;
    metric.aggregator = createAggregator(type, clock, options);
  }

  return metric;
}

export function serializeMetric(metric: BaseMetric): Record<string, any> {
  const json = metric.toJSON();
  json.id = json.id || metric.id || hashObject(json);
  return json;
}

export function serializeParams(
  metric: BaseMetric,
  type: RuleType,
  options?: Record<string, any>,
): Record<string, any> {
  const json = serializeMetric(metric);
  return {
    metric: json,
    type,
    options: { ...(options || {}) },
  };
}

export function isPollingMetric(clazz: MetricConstructor): boolean {
  let curPrototype = clazz.prototype;

  while (curPrototype != null) {
    if (curPrototype === PollingMetric.prototype) {
      return true;
    }
    curPrototype = Object.getPrototypeOf(curPrototype);
  }
  return false;
}

export * from './aggregators';
export { RateMetricOptions, DefaultRateMetricOptions } from './rateMetric';

export {
  ApdexMetric,
  ApdexMetricOptions,
  BaseMetric,
  MetricOptions,
  ConnectedClientsMetric,
  CompletedCountMetric,
  CompletedRateMetric,
  ConsecutiveFailuresMetric,
  CurrentActiveCountMetric,
  CurrentCompletedCountMetric,
  CurrentDelayedCountMetric,
  CurrentFailedCountMetric,
  CurrentWaitingCountMetric,
  ErrorPercentageMetric,
  ErrorRateMetric,
  FailedCountMetric,
  FinishedCountMetric,
  JobRateMetric,
  LatencyMetric,
  UsedMemoryMetric,
  WaitTimeMetric,
};
