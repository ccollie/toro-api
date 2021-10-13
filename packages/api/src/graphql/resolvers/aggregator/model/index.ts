import { schemaComposer } from 'graphql-compose';
import { AggregatorTypes, BaseAggregator } from '@alpen/core/metrics';
import { createEnumFromTS } from '../../../scalars';
import { getStaticProp } from '@alpen/shared';

export const AggregateTypeEnum = createEnumFromTS(
  AggregatorTypes,
  'AggregateTypeEnum',
);

export const AggregatorTC = schemaComposer.createObjectTC({
  name: 'Aggregator',
  fields: {
    type: AggregateTypeEnum.NonNull,
    options: 'JSONObject',
    description: {
      type: 'String!',
      resolve: (agg: BaseAggregator) => {
        return getStaticProp(agg, 'description');
      },
    },
  },
});

export const AggregatorInputTC =
  AggregatorTC.getITC().removeField('description');
