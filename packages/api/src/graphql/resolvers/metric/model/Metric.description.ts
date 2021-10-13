import { FieldConfig } from '../../utils';
import { BaseMetric } from '@alpen/core/metrics';

export const metricDescriptionFC: FieldConfig = {
  type: 'String!',
  description: 'Returns the description of the metric',
  args: {},
  resolve(metric: BaseMetric): string {
    if (metric.description) return metric.description;
    const { aggregator } = metric;
    return aggregator.getDescription(metric, false);
  },
};
