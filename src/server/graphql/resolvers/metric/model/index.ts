import { schemaComposer } from 'graphql-compose';
import { metricDataFC } from './Metric.data';
import { metricDataOutliersFC as outliers } from './Metric.outliers';
import { metricDateRangeFC as dateRange } from './Metric.date-range';
import { AggregatorTC, BaseFields } from '../scalars';
import { metricHistogramFC as histogram } from './Metric.histogram';
import { metricSummaryStatsFC as summaryStats } from './Metric.summary-stats';
// eslint-disable-next-line max-len
import { metricPercentileDistributionFC as percentileDistribution } from './Metric.percentile-distribution';

export const MetricTC = schemaComposer.createObjectTC({
  name: 'Metric',
  description: 'Metrics are numeric samples of data collected over time',
  fields: {
    id: {
      type: 'ID!',
      description: 'the id of the metric',
    },
    ...BaseFields,
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
    aggregator: AggregatorTC.NonNull,
    data: metricDataFC,
    outliers,
    histogram,
    percentileDistribution,
    summaryStats,
    dateRange,
  },
});
