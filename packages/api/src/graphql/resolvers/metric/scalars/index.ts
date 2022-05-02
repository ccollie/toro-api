import { schemaComposer } from 'graphql-compose';
import { SupportedMetric } from './enums';

export const BaseFields = {
  type: SupportedMetric.NonNull,
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
  .makeFieldNullable(['name']);

export * from './enums';
export * from './extended-metric';
export * from './Meter';
export * from './MetricsQueryInput';
export * from './metric-name';
export * from './MetricType';
export * from './MetricCategory';
