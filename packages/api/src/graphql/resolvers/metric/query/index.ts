import { schemaComposer } from 'graphql-compose';
import { metricDataFC } from './data';
import { metricDataOutliersFC as outliers } from './outliers';
import { metricDateRangeFC as dateRange } from './date-range';
import { MetricTypeTC } from '../scalars';
import { stats } from './stats';
import { aggregate } from './aggregate';
import { rate } from './rate';
// eslint-disable-next-line max-len
import { metricPercentileDistributionFC as percentileDistribution } from './percentile-distribution';
import { Metric } from '@alpen/core';
import { getStaticProp } from '@alpen/shared';
import { AggregationTypeEnum } from '../../../scalars';

// todo: https://www.dynatrace.com/support/help/dynatrace-api/environment-api/metric-v2/get-all-metrics#definition--MetricDescriptor

export const MetricTC = schemaComposer.createObjectTC({
  name: 'Metric',
  description: 'Metrics are numeric samples of data collected over time',
  fields: {
    id: {
      type: 'ID!',
      description: 'the id of the metric',
    },
    type: {
      type: MetricTypeTC.NonNull,
      resolve: (metric: Metric) => {
        return getStaticProp(metric, 'type');
      },
    },
    unit: {
      type: 'String!',
      description: 'The unit of the metric',
    },
    description: {
      type: 'String!',
      description: 'A short description of the metric',
    },
    aggregationTypes: {
      type: AggregationTypeEnum.List.NonNull,
      description: 'The list of allowed aggregations for this metric.',
    },
    defaultAggregation: {
      type: AggregationTypeEnum.NonNull,
      description: 'The default aggregation for this metric.',
    },
    createdAt: {
      type: 'Date!',
      description: 'Timestamp of when this metric was created',
    },
    updatedAt: {
      type: 'Date!',
      description: 'Timestamp of when this metric was created',
    },
    canonicalName: {
      type: 'String!',
      description: 'The canonical name of the metric',
    },
    tags: {
      type: '[String!]!',
      description: 'The tags of the metric',
      resolve: (metric: Metric) => {
        const keys = metric.name.tags.keys();
        return Array.from(keys);
      },
    },
    aggregate,
    rate,
    data: metricDataFC,
    outliers,
    percentileDistribution,
    stats,
    dateRange,
  },
});
