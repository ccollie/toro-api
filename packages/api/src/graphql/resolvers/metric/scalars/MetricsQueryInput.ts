import { schemaComposer } from 'graphql-compose';
import {
  AggregationTypeEnum,
  MetricGranularityEnum,
  SupportedMetric,
} from './enums';
import { MetricGranularity } from '@alpen/core';

export const MetricsQueryInputTC = schemaComposer.createInputTC({
  name: 'MetricsQueryInput',
  description: 'Metrics filter.',
  fields: {
    metric: {
      type: SupportedMetric.NonNull,
      makeRequired: true,
      description: 'The metric requested',
    },
    granularity: {
      type: MetricGranularityEnum,
      defaultValue: MetricGranularity.Minute,
      description: 'Stats snapshot granularity',
    },
    start: {
      type: 'Date!',
      description: 'Range start',
    },
    end: {
      type: 'Date!',
      description: 'Range end',
    },
    aggregator: {
      type: AggregationTypeEnum.NonNull,
    },
  },
});
