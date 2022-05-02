import {
  AggregationType,
  isHostMetric,
  MetricFamily,
  MetricGranularity,
  metricsInfo,
} from '@alpen/core';
import { createEnumFromTS } from '../../../scalars';
import { EnumTypeComposer, schemaComposer } from 'graphql-compose';

export const MetricGranularityEnum = createEnumFromTS(
  MetricGranularity,
  'MetricGranularity',
);

export const AggregationTypeEnum = createEnumFromTS(
  AggregationType,
  'AggregationType',
);

function createMetricTypesTS(
  name: string,
  description: string,
  filter?: (x: MetricFamily) => boolean,
): EnumTypeComposer<any> {
  filter = filter ?? ((x: MetricFamily) => true);
  const values: Record<string, any> = Object.create(null);
  const metricTypes = new Set(metricsInfo.filter(filter).map((x) => x.name));

  metricTypes.forEach((k, info) => {
    // ignore numeric keys
    if (!isNaN(parseInt(k))) return;
    values[k] = { value: k };
  });

  return schemaComposer.createEnumTC({
    name,
    description,
    values,
  });
}

export const SupportedMetric = createMetricTypesTS(
  'SupportedMetric',
  'Available Metrics',
);

export const SupportedHostMetric = createMetricTypesTS(
  'SupportedHostMetric',
  'Available host metric names',
  (x) => isHostMetric(x.name),
);
