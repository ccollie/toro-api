import { FieldConfig } from '../../utils';
import { MetricTC } from '../../metric/query';
import { Metric, HostManager } from '@alpen/core';

export const metrics: FieldConfig = {
  type: MetricTC.NonNull.List.NonNull,
  description: 'The metrics associated with the host',
  args: {},
  async resolve(host: HostManager): Promise<Metric[]> {
    const manager = host.metricsManager;
    return manager.metrics;
  },
};
