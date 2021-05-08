import { FieldConfig } from '../index';
import { aggregateMap } from '../../../metrics';
import { schemaComposer } from 'graphql-compose';
import { AggregatorTypes } from '../../../../types';

export interface AggregateInfo {
  type: AggregatorTypes;
  description: string;
}

export const aggregates: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'AggregateInfo',
    fields: {
      type: 'AggregateTypeEnum!',
      description: 'String!',
    },
  }).List.NonNull,
  description: 'Get the list of aggregate types available for metrics',
  args: {},
  resolve(): AggregateInfo[] {
    const result: AggregateInfo[] = [];
    for (const [key, ctor] of Object.entries(aggregateMap)) {
      if (ctor) {
        result.push({
          type: key as AggregatorTypes,
          description: (ctor as any).description,
        });
      }
    }
    return result;
  },
};
