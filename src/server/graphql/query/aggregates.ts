import { FieldConfig } from '../types';
import { aggregateMap } from '../../metrics';
import { schemaComposer } from 'graphql-compose';

export interface AggregateInfo {
  key: string;
  description: string;
}

export const aggregates: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'AggregateInfo',
    fields: {
      key: 'String!',
      description: 'String!',
    },
  }).List.NonNull,
  description: 'Get the list of aggregate types available for metrics',
  args: {},
  resolve(): AggregateInfo[] {
    const keys = Object.keys(aggregateMap);
    return keys.map((key) => {
      const ctor = aggregateMap[key];
      return {
        key: (ctor as any).key,
        description: (ctor as any).description,
      };
    });
  },
};
