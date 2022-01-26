import { GraphQLScalarType, Kind } from 'graphql';
import { parseDuration } from '@alpen/shared';

export const Duration = new GraphQLScalarType({
  name: 'Duration',
  description:
    'Specifies a duration in milliseconds - either as an int or a string specification ' +
    'e.g. "2 min", "3 hr"',
  parseValue(value): number {
    // value is from client. TODO: throw Apollo error on error
    return parseDuration(value);
  },
  serialize(value): number {
    // value sent to the client
    if (typeof value === 'number') {
      return value;
    }
    return parseDuration(value);
  },
  parseLiteral(ast): number | null {
    if (ast.kind === Kind.INT) {
      return parseInt(ast.value, 10); // ast value is always in string format
    } else if (ast.kind === Kind.STRING) {
      return parseDuration(ast.value);
    }
    return null;
  },
});
