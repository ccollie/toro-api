import { schemaComposer } from 'graphql-compose';
import { AggregatorTypes } from '@src/types';
import { createEnumFromTS } from '@server/graphql/helpers';
import { BaseAggregator } from '@server/metrics';
import { getStaticProp } from '@lib/utils';

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
