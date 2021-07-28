import { GraphQLScalarType, Kind } from 'graphql';
import { isString, isBoolean } from 'lodash';
import { isNumber, safeParse } from '@alpen/shared';

function isBool(value): boolean {
  return isString(value) && ['true', 'false'].includes(value);
}

export const JobRemoveOption = new GraphQLScalarType({
  name: 'JobRemoveOption',
  description:
    'Specifies the number of jobs to keep after an operation (e.g. complete or fail).' +
    'A bool(true) causes a job to be removed after the action',
  parseValue(value) {
    // from client
    if (isNumber(value)) {
      return parseInt(value);
    }
    if (isBool(value)) {
      return value === 'true';
    }
    return null;
  },
  serialize(value): any {
    // value sent to the client
    if (isNumber(value)) {
      return parseInt(value, 10);
    }
    if (isBoolean(value)) {
      return value;
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
