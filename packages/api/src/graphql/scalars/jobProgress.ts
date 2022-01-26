import { GraphQLScalarType, Kind } from 'graphql';
import { isObject, isString } from '@alpen/shared';
import { safeParse } from '@alpen/shared';

export const JobProgress = new GraphQLScalarType({
  name: 'JobProgress',
  description:
    'Job process. Either a number (percentage) or user specified data',
  parseValue(value) {
    // from client
    if (typeof value == 'number') {
      return value;
    }
    if (isString(value)) {
      return safeParse(value);
    }
    return value;
  },
  serialize(value): any {
    // value sent to the client
    if (typeof value === 'string') {
      const val = parseInt(value, 10);
      if (!Number.isNaN(val)) return val;
    }
    if (isObject(value)) {
      return JSON.stringify(value);
    }
    return value;
  },
  parseLiteral(ast): any {
    if (ast.kind === Kind.INT) {
      return parseInt(ast.value, 10); // ast value is always in string format
    } else if (ast.kind === Kind.STRING) {
      return safeParse(ast.value);
    }
    return null;
  },
});
