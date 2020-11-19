import { FieldConfig } from '../types';
import { isPollingMetric, metricsMap, MetricTypeEnum } from '../../metrics';
import { schemaComposer, upperFirst } from 'graphql-compose';
import { MetricCategory, MetricType } from '../types/scalars';

export interface MetricsInfo {
  key: string;
  type: MetricTypeEnum;
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
  type: MetricsInfoTC.List.NonNull,
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
