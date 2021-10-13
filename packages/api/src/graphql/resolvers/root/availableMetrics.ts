import { FieldConfig } from '../index';
import { getClassMetadata, metricsMap, MetricInfo } from '@alpen/core/metrics';
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
