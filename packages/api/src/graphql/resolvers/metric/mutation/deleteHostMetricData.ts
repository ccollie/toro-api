import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../utils';
import { schemaComposer } from 'graphql-compose';
import boom from '@hapi/boom';

export const deleteHostMetricData: FieldConfig = {
  description: 'Delete all the stored data for a host metric',
  type: schemaComposer.createObjectTC({
    name: 'DeleteHostMetricDataResult',
    fields: {
      count:  {
        type: 'Int!',
        description: 'The number of records deleted'
      },
    },
  }).NonNull,
  args: {
    input: schemaComposer.createInputTC({
      name: 'DeleteHostMetricDataInput',
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
    const result = await manager.clearData(metricId);
    return {
      count: result
    };
  },
};
