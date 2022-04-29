import { EnumTypeComposer, schemaComposer } from 'graphql-compose';
import { metricsInfo } from '@alpen/core';

function createMetricTypesTS(): EnumTypeComposer<any> {
  const values: Record<string, any> = Object.create(null);
  const metricTypes = new Set(metricsInfo.map((x) => x.type));

  metricTypes.forEach((k, info) => {
    values[k] = { value: k };
  });
  return schemaComposer.createEnumTC({
    name: 'MetricType',
    values,
    description: 'Available metric names',
  });
}

export const MetricTypeTC = createMetricTypesTS();

export const BaseFields = {
  type: MetricTypeTC.NonNull,
  name: {
    type: 'String!',
    description: 'The name of the metric',
  },
};

const InputFields = {
  queueId: {
    type: 'ID!',
    description: 'The id of the queue to which the metric belongs',
  },
  ...BaseFields,
};

export const MetricInputTC = schemaComposer
  .createInputTC({
    name: 'MetricInput',
    description: 'Input fields for updating a metric',
    fields: {
      id: {
        type: 'ID!',
        description: 'the id of the metric',
      },
      ...InputFields,
    },
  })
  .makeFieldNullable(['name', 'options', 'aggregator']);

export const CreateMetricInputTC = schemaComposer
  .createInputTC({
    name: 'CreateMetricInput',
    description: 'Input fields for creating a metric',
    fields: {
      ...InputFields,
    },
  })
  .makeRequired(['name', 'queueId']);

export * from './Meter';
export * from './MetricsQueryInput';
