import boom from '@hapi/boom';
import { GraphQLScalarType, Kind, print } from 'graphql';
import { validateFilterExpression } from '@alpen/core';
import { isObject, safeParse } from '@alpen/shared';

function validate(query) {
  try {
    validateFilterExpression(query);
  } catch (err) {
    throw boom.badRequest('Invalid filter query', err);
  }
}

function ensureObject(value: any): Record<string, any> {
  if (typeof value === 'string') {
    value = safeParse(value);
  }
  if (!isObject(value)) {
    throw new TypeError(
      `JobFilterQuery cannot represent non-object value: ${value}`,
    );
  }

  validate(value);
  return value;
}

const TYPENAME = 'JobFilterQuery';

function parseLiteral(ast, variables): any {
  switch (ast.kind) {
    case Kind.STRING:
    case Kind.BOOLEAN:
      return ast.value;
    case Kind.INT:
    case Kind.FLOAT:
      return parseFloat(ast.value);
    case Kind.OBJECT:
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      return parseObject(ast, variables);
    case Kind.LIST:
      return ast.values.map((n) => parseLiteral(n, variables));
    case Kind.NULL:
      return null;
    case Kind.VARIABLE:
      return variables ? variables[ast.name.value] : undefined;
    default:
      throw new TypeError(`${TYPENAME} cannot represent value: ${print(ast)}`);
  }
}

function parseObject(ast, variables): Record<string, any> {
  const value = Object.create(null);
  ast.fields.forEach((field) => {
    // eslint-disable-next-line no-use-before-define
    value[field.name.value] = parseLiteral(field.value, variables);
  });

  return value;
}

export const GraphQLJobFilterQuery = new GraphQLScalarType({
  name: 'JobFilterQuery',
  description:
    // eslint-disable-next-line max-len
    'This type represents a job filter query using a subset of Javascript',
  serialize: ensureObject,
  parseValue: ensureObject,
  parseLiteral: (ast, variables) => {
    if (ast.kind === Kind.STRING) {
      return ensureObject(ast.value);
    } else if (ast.kind !== Kind.OBJECT) {
      throw new TypeError(`JobFilterQuery must be an object: ${print(ast)}`);
    }

    const schema = parseObject(ast, variables);

    validate(schema);

    return schema;
  },
});
