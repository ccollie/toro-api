import { GraphQLScalarType, Kind } from 'graphql';
import { isObject, isString } from 'lodash';
import { isNumber, safeParse } from '../../../lib';

export const JobProgress = new GraphQLScalarType({
  name: 'JobProgress',
  description:
    'Job process. Either a number (percentage) or user specified data',
  parseValue(value) {
    // from client
    if (isNumber(value)) {
      return parseInt(value);
    }
    if (isString(value)) {
      return safeParse(value);
    }
    return value;
  },
  serialize(value): any {
    // value sent to the client
    if (isNumber(value)) {
      return parseInt(value, 10);
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
