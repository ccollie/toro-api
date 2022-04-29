import { GraphQLScalarType, Kind } from 'graphql';
import { MetricName } from '@alpen/core';

export const MetricNameScalar = new GraphQLScalarType({
  name: 'MetricName',
  description: `A metric name has a string name like "clientCount", and an optional list
  of tags, each of which has a string name and value (for example key "host", value "production").
  Tags allow the same metric to be measured along several different dimensions and collated later.`,
  parseValue(value): MetricName {
    // todo: rename this func
    return MetricName.fromCanonicalName(value + '');
  },
  serialize(value) {
    if (typeof value === 'string') return value;
    if (value instanceof MetricName) {
      return value.canonical;
    }
    // todo: error
    return value + '';
  },
  parseLiteral(ast): MetricName | null {
    if (ast.kind === Kind.STRING) {
      return MetricName.fromCanonicalName(ast.value);
    }
    return null;
  },
});
