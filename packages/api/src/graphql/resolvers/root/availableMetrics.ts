import { FieldConfig } from '../index';
import { metricsInfo, MetricFamily } from '@alpen/core';
import { schemaComposer } from 'graphql-compose';
import { MetricTypeTC } from '../metric/scalars';

const MetricsInfoTC = schemaComposer.createObjectTC({
  name: 'MetricInfo',
  fields: {
    key: 'String!',
    description: 'String',
    category: 'MetricCategory!',
    type: MetricTypeTC.NonNull,
    valueType: 'MetricValueType!',
    unit: 'String',
  },
});

// TODO: !!!!!!!!!!!!!!!
export const availableMetrics: FieldConfig = {
  type: MetricsInfoTC.NonNull.List.NonNull,
  description: 'Get the list of available metric types',
  resolve(): MetricFamily[] {
    return metricsInfo;
  },
};
