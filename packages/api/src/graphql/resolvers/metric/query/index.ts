import { schemaComposer } from 'graphql-compose';
import { metricDataFC } from './data';
import { metricDataOutliersFC as outliers } from './outliers';
import { metricDateRangeFC as dateRange } from './date-range';
import { BaseFields, MetricTypeTC } from '../scalars';
import { metricHistogramFC as histogram } from './histogram';
import { metricSummaryStatsFC as summaryStats } from './summary-stats';
import { metricDescriptionFC as description } from './description';
// eslint-disable-next-line max-len
import { metricPercentileDistributionFC as percentileDistribution } from './percentile-distribution';
import { BaseMetric } from '@alpen/core';
import { AggregatorTC } from '../../aggregator/query';
import { getStaticProp } from '@alpen/shared';

export const MetricTC = schemaComposer.createObjectTC({
  name: 'Metric',
  description: 'Metrics are numeric samples of data collected over time',
  fields: {
    id: {
      type: 'ID!',
      description: 'the id of the metric',
    },
    ...BaseFields,
    type: {
      type: MetricTypeTC.NonNull,
      resolve: (metric: BaseMetric) => {
        return getStaticProp(metric, 'type');
      },
    },
    category: {
      type: 'MetricCategory!',
      resolve: (metric: BaseMetric) => {
        return getStaticProp(metric, 'category');
      },
    },
    unit: {
      type: 'String!',
      resolve: (metric: BaseMetric) => {
        return getStaticProp(metric, 'unit');
      },
    },
    currentValue: {
      type: 'Float',
      description: 'The current value of the metric',
      resolve: (metric: BaseMetric) => {
        return metric.value;
      },
    },
    createdAt: {
      type: 'Date!',
      description: 'Timestamp of when this metric was created',
    },
    updatedAt: {
      type: 'Date!',
      description: 'Timestamp of when this metric was created',
    },
    options: {
      type: 'JSONObject!',
      description: 'The metric options',
    },
    description,
    aggregator: AggregatorTC.NonNull,
    data: metricDataFC,
    outliers,
    histogram,
    percentileDistribution,
    summaryStats,
    dateRange,
  },
});
