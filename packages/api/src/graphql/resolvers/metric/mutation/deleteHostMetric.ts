import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../utils';
import { schemaComposer } from 'graphql-compose';
import boom from '@hapi/boom';

export const deleteHostMetric: FieldConfig = {
  description: 'Delete a host metric',
  type: schemaComposer.createObjectTC({
    name: 'DeleteHostMetricResult',
    fields: {
      isDeleted: 'Boolean!',
    },
  }).NonNull,
  args: {
    input: schemaComposer.createInputTC({
      name: 'DeleteHostMetricInput',
      fields: {
        host: 'String!',
        metricId: 'ID!',
      },
    }).NonNull,
  },
  async resolve(_, { input }, { accessors }: EZContext) {
    const { host: _host, metricId } = input;
    const host = accessors.getHost(_host);
    const manager = host.metricsManager;
    const result = await manager.deleteMetric(metricId);

    if (!result) {
      throw boom.notFound(`No filter found with id "${metricId}"`);
    }

    return {
      isDeleted: result,
    };
  },
};
