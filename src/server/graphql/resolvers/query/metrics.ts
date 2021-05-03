import { FieldConfig } from '../index';
import { isPollingMetric, metricsMap } from '../../../metrics';
import { schemaComposer, upperFirst } from 'graphql-compose';
import { MetricCategory, MetricType } from '../metrics';
import { MetricTypes } from '../../imports';

export interface MetricsInfo {
  key: string;
  type: MetricTypes;
  description: string;
  unit: string;
  category: string;
  isPolling: boolean;
}

const MetricsInfoTC = schemaComposer.createObjectTC({
  name: 'MetricInfo',
  fields: {
    key: 'String!',
    description: 'String',
    category: {
      type: MetricCategory,
      makeRequired: true,
    },
    type: {
      type: MetricType,
      makeRequired: true,
    },
    unit: 'String',
    isPolling: 'Boolean!',
  },
});

export const metrics: FieldConfig = {
  type: MetricsInfoTC.NonNull.List.NonNull,
  description: 'Get the list of metrics available',
  resolve(): MetricsInfo[] {
    const keys = Array.from(metricsMap.keys());
    return keys.map((k) => {
      const ctor = metricsMap.get(k);
      const { key, description, unit, type } = ctor as any;
      const category = upperFirst(ctor['category']);
      const isPolling = isPollingMetric(ctor);
      return {
        key,
        type,
        description,
        unit,
        category,
        isPolling,
      };
    });
  },
};
