import { schemaComposer } from 'graphql-compose';
import { AggregatorTypes, MetricTypes } from '../../imports';
import { metricDataFC } from './Metric.data';
import { createEnumFromTS } from '../../helpers';

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

export const MetricTypesTC = createEnumFromTS(MetricTypes, 'MetricTypeEnum');

const BaseFields = {
  type: MetricTypesTC.NonNull,
  queueId: {
    type: 'String!',
    description: 'The id of the queue to which the metric belongs',
  },
  name: {
    type: 'String!',
    description:
      'The minimum number of violations before an alert can be raised',
  },
  description: {
    type: 'String',
    description: 'A description of the metric being measured.',
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

export const MetricTC = schemaComposer.createObjectTC({
  name: 'Metric',
  description: 'Metrics are numeric samples of data collected over time',
  fields: {
    id: {
      type: 'String!',
      description: 'the id off the metric',
    },
    ...BaseFields,
    createdAt: {
      type: 'Date!',
      description: 'Timestamp of when this metric was created',
    },
    updateAt: {
      type: 'DateTime!',
      description: 'Timestamp of when this metric was created',
    },
    options: {
      type: 'JSONObject!',
      description: 'The metric options',
    },
    aggregator: AggregatorTC.NonNull,
    data: metricDataFC,
  },
});

export const MetricInputTC = schemaComposer
  .createInputTC({
    name: 'MetricInput',
    description: 'Input fields for updating a metric',
    fields: {
      ...InputFields,
    },
  })
  .makeFieldNullable(['name', 'options', 'aggregator']);

export const MetricCreateTC = schemaComposer
  .createInputTC({
    name: 'MetricCreateInput',
    description: 'Input fields for creating a metric',
    fields: {
      ...InputFields,
    },
  })
  .makeRequired('name');
