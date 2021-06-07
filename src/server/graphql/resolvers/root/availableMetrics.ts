import { FieldConfig } from '../index';
import { getClassMetadata, metricsMap } from '../../../metrics';
import { schemaComposer } from 'graphql-compose';
import {
  MetricCategory as MetricCategoryTC,
  MetricValueTypeTC,
  MetricTypeTC,
} from '../metrics';
import { MetricInfo } from '../../imports';

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
  description: 'Get the list of metrics available',
  resolve(): MetricInfo[] {
    return Array.from(metricsMap.values()).map(getClassMetadata);
  },
};
