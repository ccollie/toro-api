import { aggregateMap, AggregatorTypes } from '@alpen/core';
import { schemaComposer } from 'graphql-compose';
import { FieldConfig } from '../index';

export interface AggregateInfo {
  type: AggregatorTypes;
  isWindowed: boolean;
  description: string;
}

export const aggregates: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'AggregateInfo',
    fields: {
      type: 'AggregateTypeEnum!',
      description: 'String!',
      isWindowed: 'Boolean!',
    },
  }).List.NonNull,
  description: 'Get the list of aggregate types available for metrics',
  args: {},
  resolve(): AggregateInfo[] {
    const result: AggregateInfo[] = [];
    for (const [, ctor] of Object.entries(aggregateMap)) {
      if (ctor) {
        result.push({
          type: (ctor as any).key,
          isWindowed: !!(ctor as any).isWindowed,
          description: (ctor as any).description,
        });
      }
    }
    return result;
  },
};
