import { FieldConfig } from '../../utils';
import { Metric } from '@alpen/core';

export const metricDescriptionFC: FieldConfig = {
  type: 'String!',
  description: 'Returns the description of the metric',
  args: {},
  resolve(metric: Metric): string {
    return metric.description;
  },
};
