import { FieldConfig } from '../index';
import { getClassMetadata, metricsMap } from '@src/server/metrics';
import { schemaComposer } from 'graphql-compose';
import {
  MetricCategory as MetricCategoryTC,
  MetricValueTypeTC,
  MetricTypeTC,
} from '../metric';
import { MetricInfo } from '@src/types';

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
