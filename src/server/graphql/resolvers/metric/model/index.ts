import { schemaComposer } from 'graphql-compose';
import { metricDataFC } from './Metric.data';
import { metricDataPeaksFC } from './Metric.dataPeaks';
import { AggregatorTC, BaseFields } from '../scalars';

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
    dataPeaks: metricDataPeaksFC,
  },
});
