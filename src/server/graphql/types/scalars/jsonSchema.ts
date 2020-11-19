import boom from '@hapi/boom';
import { GraphQLScalarType, Kind, print } from 'graphql';
import { ajv } from '../../../validation/ajv';

function validate(schema) {
  try {
    ajv.compile(schema);
  } catch (err) {
    throw boom.badRequest('Invalid JSON Schema', ajv.errors);
  }
}

function ensureObject(value: any): object {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(
      `JSONSchema cannot represent non-object value: ${value}`,
    );
  }

  validate(value);
  return value;
}

const TYPENAME = 'JSONSchema';

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

function parseObject(ast, variables): object {
  const value = Object.create(null);
  ast.fields.forEach((field) => {
    // eslint-disable-next-line no-use-before-define
    value[field.name.value] = parseLiteral(field.value, variables);
  });

  return value;
}

export const GraphQLJSONSchema = new GraphQLScalarType({
  name: 'JSONSchema',
  description:
    // eslint-disable-next-line max-len
    'The `JSONSchema` scalar type represents JSONSchema values as specified by https://json-schema.org/draft/2019-09/json-schema-validation.html.',
  serialize: ensureObject,
  parseValue: ensureObject,
  parseLiteral: (ast, variables) => {
    if (ast.kind !== Kind.OBJECT) {
      throw new TypeError(`JSONSchema must be an object: ${print(ast)}`);
    }

    const schema = parseObject(ast, variables);

    validate(schema);

    return schema;
  },
});
