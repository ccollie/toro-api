import { EZContext } from 'graphql-ez';
import { schemaComposer } from 'graphql-compose';
import { SupportedHostMetric } from '../scalars';
import { FieldConfig } from '../../utils';
import { MetricTC } from '../query';

const CreateHostMetricInputTC = schemaComposer.createInputTC({
  name: 'CreateHostMetricInput',
  description: 'Input fields for creating a host metric',
  fields: {
    host: {
      type: 'String!',
      description: 'The host to add the metric to',
    },
    name: {
      type: SupportedHostMetric.NonNull,
      description: 'The metric to collect',
    },
  },
});

export const createHostMetric: FieldConfig = {
  name: 'createHostMetric',
  description: 'Create a host metric',
  type: MetricTC.NonNull,
  args: {
    input: CreateHostMetricInputTC.NonNull,
  },
  resolve: async (_, { input }, { accessors }: EZContext) => {
    const { host, name } = input;
    const hostMgr = accessors.getHost(host);
    const manager = hostMgr.metricsManager;
    return manager.createMetric(name);
  },
};
