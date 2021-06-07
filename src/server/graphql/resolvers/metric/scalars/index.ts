import { schemaComposer } from 'graphql-compose';
import { createEnumFromTS } from '../../../helpers';
import { AggregatorTypes, MetricTypes } from '@src/types';

export const AggregateTypeEnum = createEnumFromTS(
  AggregatorTypes,
  'AggregateTypeEnum',
);

export const AggregatorTC = schemaComposer.createObjectTC({
  name: 'Aggregator',
  fields: {
    type: AggregateTypeEnum.NonNull,
    options: 'JSONObject',
  },
});

export const AggregatorInputTC = AggregatorTC.getITC();

export const MetricTypeTC = createEnumFromTS(MetricTypes, 'MetricType');

export const BaseFields = {
  type: MetricTypeTC.NonNull,
  queueId: {
    type: 'ID!',
    description: 'The id of the queue to which the metric belongs',
  },
  name: {
    type: 'String!',
    description: 'The name of the metric',
  },
  description: {
    type: 'String',
    description: 'A description of the metric being measured.',
  },
  sampleInterval: {
    type: 'Int',
    description: 'The metric sampling interval.',
  },
  isActive: {
    type: 'Boolean!',
    description: 'Is the metric active (i.e. is data being collected).',
  },
  options: {
    type: 'JSONObject!',
    description: 'The metric options',
  },
};

const InputFields = {
  ...BaseFields,
  aggregator: AggregatorInputTC,
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
  .makeFieldNullable(['name', 'options', 'aggregator', 'sampleInterval']);

export const MetricCreateTC = schemaComposer
  .createInputTC({
    name: 'MetricCreateInput',
    description: 'Input fields for creating a metric',
    fields: {
      ...InputFields,
    },
  })
  .makeOptional('sampleInterval')
  .makeRequired(['name', 'queueId']);

export * from './MetricCategory';
export * from './MetricValueType';
