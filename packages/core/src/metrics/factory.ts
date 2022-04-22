import * as boom from '@hapi/boom';
import { CompletedCountMetric } from './completedCountMetric';
import { CompletedRateMetric } from './completedRateMetric';
import { FailedCountMetric } from './failedCountMetric';
import { FinishedCountMetric } from './finishedCountMetric';
import { WaitTimeMetric } from './waitTimeMetric';
import { LatencyMetric } from './latencyMetric';
import { ResponseTimeMetric } from './responseTimeMetric';
import { BaseMetric, PollingMetric } from './baseMetric';
import {
  ConnectedClientsMetric,
  FragmentationRatioMetric,
  InstantaneousOpsMetric,
  PeakMemoryMetric,
  UsedMemoryMetric,
} from './redisMetrics';
import { ApdexMetric } from './apdexMetric';
import { parseTimestamp, hashObject, parseBool } from '@alpen/shared';
import { isNil, isObject, isString } from '@alpen/shared';
import { logger } from '../logger';
import {
  Constructor,
  MetricInfo,
  MetricTypes,
} from '../types';
import { ActiveCountMetric } from './activeCountMetric';
import { DelayedCountMetric } from './delayedCountMetric';
import { WaitingCountMetric } from './waitingCountMetric';
import { WaitingChildrenCountMetric } from './waitingChildrenCountMetric';
import { PendingCountMetric } from './pendingCountMetric';

export type MetricConstructor = Constructor<BaseMetric>;

export const metricsByEnum: Record<MetricTypes, MetricConstructor | null> = {
  [MetricTypes.None]: null, //
  [MetricTypes.Apdex]: ApdexMetric,
  [MetricTypes.ConnectedClients]: ConnectedClientsMetric,
  [MetricTypes.Completed]: CompletedCountMetric,
  [MetricTypes.CompletedRate]: CompletedRateMetric,
  [MetricTypes.ActiveJobs]: ActiveCountMetric,
  [MetricTypes.DelayedJobs]: DelayedCountMetric,
  [MetricTypes.Failures]: FailedCountMetric,
  [MetricTypes.Finished]: FinishedCountMetric,
  [MetricTypes.FragmentationRatio]: FragmentationRatioMetric,
  [MetricTypes.Latency]: LatencyMetric,
  [MetricTypes.UsedMemory]: UsedMemoryMetric,
  [MetricTypes.PeakMemory]: PeakMemoryMetric,
  [MetricTypes.PendingCount]: PendingCountMetric,
  [MetricTypes.ResponseTime]: ResponseTimeMetric,
  [MetricTypes.InstantaneousOps]: InstantaneousOpsMetric,
  [MetricTypes.Waiting]: WaitingCountMetric,
  [MetricTypes.WaitingChildren]: WaitingChildrenCountMetric,
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
  ActiveJobs: ActiveCountMetric,
  DelayedJobs: DelayedCountMetric,
  Failures: FailedCountMetric,
  Finished: FinishedCountMetric,
  FragmentationRatio: FragmentationRatioMetric,
  Latency: LatencyMetric,
  UsedMemory: UsedMemoryMetric,
  PeakMemory: PeakMemoryMetric,
  PendingCount: PendingCountMetric,
  ResponseTime: ResponseTimeMetric,
  InstantaneousOps: InstantaneousOpsMetric,
  Waiting: WaitingCountMetric,
  WaitingChildren: WaitingChildrenCountMetric,
  WaitTime: WaitTimeMetric,
};

export function getMetricByKey(type: string | MetricTypes): MetricConstructor {
  let ctor: MetricConstructor;
  if (typeof type === 'string') {
    ctor = metricsMap[type];
    if (!ctor) {
      const asInt = parseInt(type);
      if (!isNaN(asInt)) {
        const mtype = asInt as MetricTypes;
        ctor = metricsByEnum[mtype];
      }
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

export function createMetricFromJSON(json: Record<string, any>): BaseMetric {
  /// TODO: Hackish handling of createdAt, updatedAt
  const {
    id,
    type,
    name,
    options: _options,
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
  if (!metric) {
    logger.error(`Error loading metric. Type "${type}" invalid.`);
    return metric;
  }

  metric.id = id;
  metric.name = name;

  if (createdAt) {
    metric.createdAt = parseTimestamp(createdAt);
  }

  if (updatedAt) {
    metric.updatedAt = parseTimestamp(createdAt);
  }

  metric.isActive = parseBool(isActive);

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

export function isTypeOfMetric(
  clazz: MetricConstructor,
  target: MetricConstructor,
): boolean {
  let curPrototype = clazz.prototype;

  while (curPrototype != null) {
    if (curPrototype === target.prototype) {
      return true;
    }
    curPrototype = Object.getPrototypeOf(curPrototype);
  }
  return false;
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
  return {
    type: ctor.key,
    key: ctor.key,
    category: ctor.category,
    unit: ctor.unit,
    valueType: ctor.type,
    description: ctor.description,
    isPolling: isPollingMetric(clazz),
  };
}
