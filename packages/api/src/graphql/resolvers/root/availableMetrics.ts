import { FieldConfig } from '../index';
import { getClassMetadata, metricsMap, MetricInfo } from '@alpen/core';
import { schemaComposer } from 'graphql-compose';
import {
  MetricCategoryTC as MetricCategoryTC,
  MetricValueTypeTC,
  MetricTypeTC,
} from '../metric';

const MetricsInfoTC = schemaComposer.createObjectTC({
  name: 'MetricInfo',
  fields: {
    key: 'String!',
    description: 'String',
    category: {
      type: MetricCategoryTC,
      makeRequired: true,
    },
    type: MetricTypeTC.NonNull,
    valueType: MetricValueTypeTC.NonNull,
    unit: 'String',
    isPolling: 'Boolean!',
  },
});

export const availableMetrics: FieldConfig = {
  type: MetricsInfoTC.NonNull.List.NonNull,
  description: 'Get the list of available metric types',
  resolve(): MetricInfo[] {
    return Object.values(metricsMap)
      .filter((x) => !!x)
      .map(getClassMetadata);
  },
};
