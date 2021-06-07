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
import {
  BaseMetric,
  MetricUpdateEvent,
  MetricUpdateEventHandler,
  PollingMetric,
} from './baseMetric';
import {
  ConnectedClientsMetric,
  FragmentationRatioMetric,
  InstantaneousOpsMetric,
  PeakMemoryMetric,
  UsedMemoryMetric,
} from './redisMetrics';
import {
  CurrentActiveCountMetric,
  CurrentCompletedCountMetric,
  CurrentDelayedCountMetric,
  CurrentFailedCountMetric,
  CurrentWaitingCountMetric,
} from './jobSpotCountMetric';
import {
  AggregatorTypes,
  Constructor,
  MetricInfo,
  MetricTypes,
  QueueMetricOptions,
  SerializedAggregator,
} from '../../types';
import { createAggregator } from './aggregators';
import { Clock, hashObject, parseBool, systemClock, titleCase } from '../lib';
import { ApdexMetric, ApdexMetricOptions } from './apdexMetric';
import { parseTimestamp } from '@lib/datetime';
import { isNil, isObject, isString } from 'lodash';

export * from './constants';
export * from './metrics-listener';
export * from './sliding-window-counter';

export type MetricConstructor = Constructor<BaseMetric>;

const metricsByEnum: Record<MetricTypes, MetricConstructor | null> = {
  [MetricTypes.None]: null, //
  [MetricTypes.Apdex]: ApdexMetric,
  [MetricTypes.ConnectedClients]: ConnectedClientsMetric,
  [MetricTypes.Completed]: CompletedCountMetric,
  [MetricTypes.CompletedRate]: CompletedRateMetric,
  [MetricTypes.ConsecutiveFailures]: ConsecutiveFailuresMetric,
  [MetricTypes.ActiveJobs]: CurrentActiveCountMetric,
  [MetricTypes.CurrentCompletedCount]: CurrentCompletedCountMetric,
  [MetricTypes.DelayedJobs]: CurrentDelayedCountMetric,
  [MetricTypes.CurrentFailedCount]: CurrentFailedCountMetric,
  [MetricTypes.Waiting]: CurrentWaitingCountMetric,
  [MetricTypes.ErrorRate]: ErrorRateMetric,
  [MetricTypes.ErrorPercentage]: ErrorPercentageMetric,
  [MetricTypes.Failures]: FailedCountMetric,
  [MetricTypes.Finished]: FinishedCountMetric,
  [MetricTypes.FragmentationRatio]: FragmentationRatioMetric,
  [MetricTypes.JobRate]: JobRateMetric,
  [MetricTypes.Latency]: LatencyMetric,
  [MetricTypes.UsedMemory]: UsedMemoryMetric,
  [MetricTypes.PeakMemory]: PeakMemoryMetric,
  [MetricTypes.InstantaneousOps]: InstantaneousOpsMetric,
  [MetricTypes.WaitTime]: WaitTimeMetric,
};

export const metricsMap: {
  [key in keyof typeof MetricTypes]: MetricConstructor | null;
} = {
  None: null,
  Apdex: ApdexMetric,
  ConnectedClients: ConnectedClientsMetric,
  Completed: CompletedCountMetric,
  CompletedRate: CompletedRateMetric,
  ConsecutiveFailures: ConsecutiveFailuresMetric,
  ActiveJobs: CurrentActiveCountMetric,
  CurrentCompletedCount: CurrentCompletedCountMetric,
  DelayedJobs: CurrentDelayedCountMetric,
  CurrentFailedCount: CurrentFailedCountMetric,
  Waiting: CurrentWaitingCountMetric,
  ErrorRate: ErrorRateMetric,
  ErrorPercentage: ErrorPercentageMetric,
  Failures: FailedCountMetric,
  Finished: FinishedCountMetric,
  FragmentationRatio: FragmentationRatioMetric,
  JobRate: JobRateMetric,
  Latency: LatencyMetric,
  UsedMemory: UsedMemoryMetric,
  PeakMemory: PeakMemoryMetric,
  InstantaneousOps: InstantaneousOpsMetric,
  WaitTime: WaitTimeMetric,
};

export function getMetricByKey(type: string | MetricTypes): MetricConstructor {
  let ctor: MetricConstructor;
  if (typeof type === 'string') {
    ctor = metricsMap[type];
    if (!ctor) {
      if (!type.endsWith('Metric')) {
        type = titleCase(type) + 'Metric';
      }
      const ctors = Object.create(metricsMap);
      ctor = ctors.find((v) => v.name === type);
    }
  } else {
    ctor = metricsByEnum[type];
  }
  return ctor;
}

export function createMetric(
  type: string | MetricTypes,
  options: Record<string, any>,
): BaseMetric {
  const ctor = getMetricByKey(type);
  if (!ctor) {
    throw boom.badRequest(`Invalid metric type "${type}"`);
  }
  const args = [options];
  return new ctor(...args);
}

function deserializeObject(str: string): any {
  const empty = Object.create(null);
  if (isNil(str)) return empty;
  try {
    return isString(str) ? JSON.parse(str) : empty;
  } catch {
    // console.log
    return empty;
  }
}

export function createMetricFromJSON(
  json: Record<string, any>,
  clock: Clock = systemClock,
): BaseMetric {
  /// TODO: Hackish handling of createdAt, updatedAt
  const {
    id,
    type,
    name,
    options: _options,
    aggregator: _aggOptions,
    createdAt,
    updatedAt,
    isActive,
  } = json as Record<string, any>;

  // todo: id ?

  let options: Record<string, any>;
  if (typeof _options == 'string') {
    options = JSON.parse(_options);
    if (!isObject(options)) {
      throw boom.badRequest('Object expected for "options" field');
    }
  } else {
    options = _options;
  }

  const metric = createMetric(type, options);

  metric.id = id;
  metric.name = name;

  if (createdAt) {
    metric.createdAt = parseTimestamp(createdAt);
  }

  if (updatedAt) {
    metric.updatedAt = parseTimestamp(createdAt);
  }

  metric.isActive = parseBool(isActive);

  if (_aggOptions) {
    let aggregator: SerializedAggregator;
    if (typeof _aggOptions === 'string') {
      aggregator = deserializeObject(_aggOptions) as SerializedAggregator;
    } else {
      aggregator = _aggOptions;
    }
    const { type, options } = aggregator;
    metric.aggregator = createAggregator(type, clock, options);
  } else {
    metric.aggregator = createAggregator(AggregatorTypes.Identity, clock, {});
  }

  return metric;
}

export function serializeMetric(metric: BaseMetric): Record<string, any> {
  const json: Record<string, any> = {
    ...metric.toJSON(),
  };
  json.id = json.id || metric.id || hashObject(json);
  // serialize object fields
  if (isObject(json.options)) {
    json.options = JSON.stringify(json.options);
  }
  if (isObject(json.aggregator)) {
    json.aggregator = JSON.stringify(json.aggregator);
  }
  return json;
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

export function getClassMetadata(clazz: MetricConstructor): MetricInfo {
  const ctor = clazz as any;
  const meta: MetricInfo = {
    type: ctor.key,
    key: ctor.key,
    category: ctor.category,
    unit: ctor.unit,
    valueType: ctor.type,
    description: ctor.description,
    isPolling: isPollingMetric(clazz),
  };
  return meta;
}

export * from './aggregators';
export { RateMetricOptions, DefaultRateMetricOptions } from './rateMetric';

export {
  ApdexMetric,
  ApdexMetricOptions,
  BaseMetric,
  QueueMetricOptions,
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
  InstantaneousOpsMetric,
  FailedCountMetric,
  FinishedCountMetric,
  FragmentationRatioMetric,
  JobRateMetric,
  LatencyMetric,
  PeakMemoryMetric,
  MetricUpdateEvent,
  MetricUpdateEventHandler,
  UsedMemoryMetric,
  WaitTimeMetric,
};
