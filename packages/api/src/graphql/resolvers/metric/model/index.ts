import { schemaComposer } from 'graphql-compose';
import { metricDataFC } from './Metric.data';
import { metricDataOutliersFC as outliers } from './Metric.outliers';
import { metricDateRangeFC as dateRange } from './Metric.date-range';
import { BaseFields, MetricCategoryTC, MetricTypeTC } from '../scalars';
import { metricHistogramFC as histogram } from './Metric.histogram';
import { metricSummaryStatsFC as summaryStats } from './Metric.summary-stats';
import { metricDescriptionFC as description } from './Metric.description';
// eslint-disable-next-line max-len
import { metricPercentileDistributionFC as percentileDistribution } from './Metric.percentile-distribution';
import { BaseMetric } from '@alpen/core';
import { AggregatorTC } from '../../aggregator/model';
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
      type: MetricCategoryTC.NonNull,
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
