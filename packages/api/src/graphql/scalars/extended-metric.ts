import { GraphQLScalarType, Kind } from 'graphql';
import { parseDuration } from '@alpen/shared';
import type { ExtendedMetricTypeName } from '@alpen/core';
import { isValidMetric } from '@alpen/core';

export const ExtendedMetricScalarType = new GraphQLScalarType({
  name: 'ExtendedMetricType',
  description:
    'Metric type - allows parsing of regular metric with optional aggregate',
  parseValue(value): ExtendedMetricTypeName {
    const res = {
      metric: 'completed_percentage', // dummy
    } as ExtendedMetricTypeName;
    // todo: rename this func
    isValidMetric(value + '', res);
    return res;
  },
  serialize(value) {
    if (typeof value === 'string')
      return value;
    if (typeof value === 'object') {
      const t = (value as any);
      if (t.metric) {
        return t.metric + (t.aggregate ? `.${t.aggregate}` : '');
      }
      return '';
    }
    // value sent to the client
    if (typeof value === 'number') {
      return value;
    }
    return parseDuration(value);
  },
  parseLiteral(ast): ExtendedMetricTypeName | null {
    if (ast.kind === Kind.STRING) {
      const res = {
        metric: 'completed_percentage'
      } as ExtendedMetricTypeName;
      isValidMetric(ast.value, res);
      return res;
    }
    return null;
  },
});
