import { get } from 'lodash';
import { GraphQLInt, GraphQLObjectType, GraphQLSchema, graphql } from 'graphql';
import { GraphQLJSONSchema } from '../../../src/graphql/scalars';
import { JobOptionsSchema } from '@alpen/core';

const INVALID_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string', pattern: '^\\w+$' },
    invalidProp: { type: 'invalid', default: false },
  },
  additionalProperties: false,
};

const FIXTURE = JobOptionsSchema;

function createSchema(type) {
  return new GraphQLSchema({
    query: new GraphQLObjectType({
      name: 'Query',
      fields: {
        value: {
          type,
          args: {
            arg: { type },
          },
          resolve: (obj, { arg }) => arg,
        },
        rootValue: {
          type,
          resolve: (obj) => obj,
        },
      },
    }),
    types: [GraphQLInt],
  });
}

function extractError(err): any {
  const path = 'originalError.output.payload';
  return get(err, path);
}

describe('GraphQLJSONSchema', () => {
  let schema;

  beforeEach(() => {
    schema = createSchema(GraphQLJSONSchema);
  });

  describe('serialize', () => {
    it('should support serialization', () =>
      graphql(
        schema,
        /* GraphQL */ `
          query {
            rootValue
          }
        `,
        FIXTURE,
      ).then(({ data, errors }) => {
        expect(data.rootValue).toEqual(FIXTURE);
        expect(errors).toBeUndefined();
      }));

    it('should reject string value', () =>
      graphql(
        schema,
        /* GraphQL */ `
          query {
            rootValue
          }
        `,
        'foo',
      ).then(({ data, errors }) => {
        expect(data.rootValue).toBeNull();
        expect(errors).toMatchInlineSnapshot(`
          Array [
            [GraphQLError: JSONSchema cannot represent non-object value: foo],
          ]
        `);
      }));

    it('should reject array value', () =>
      graphql(
        schema,
        /* GraphQL */ `
          query {
            rootValue
          }
        `,
        [],
      ).then(({ data, errors }) => {
        expect(data.rootValue).toBeNull();
        expect(errors).toMatchInlineSnapshot(`
          Array [
            [GraphQLError: JSONSchema cannot represent non-object value: ],
          ]
        `);
      }));
  });

  describe('parseValue', () => {
    it('should support parsing a valid schema', () =>
      graphql(
        schema,
        /* GraphQL */ `
          query ($arg: JSONSchema!) {
            value(arg: $arg)
          }
        `,
        null,
        null,
        {
          arg: FIXTURE,
        },
      ).then(({ data, errors }) => {
        expect(data.value).toEqual(FIXTURE);
        expect(errors).toBeUndefined();
      }));

    it('should fail on invalid schema', () =>
      graphql(
        schema,
        /* GraphQL */ `
          query ($arg: JSONSchema!) {
            value(arg: $arg)
          }
        `,
        null,
        null,
        {
          arg: INVALID_SCHEMA,
        },
      ).then(({ data, errors }) => {
        expect(data).toBeUndefined();
        expect(errors).not.toBeUndefined();
        const err = extractError(errors[0]);
        expect(err.message).toBe('Invalid JSON Schema');
      }));

    it('should reject string value', () =>
      graphql(
        schema,
        /* GraphQL */ `
          query ($arg: JSONSchema!) {
            value(arg: $arg)
          }
        `,
        null,
        null,
        {
          arg: 'foo',
        },
      ).then(({ data, errors }) => {
        expect(data).toBeUndefined();
        expect(errors).toMatchInlineSnapshot(`
          Array [
            [GraphQLError: Variable "$arg" got invalid value "foo"; Expected type JSONSchema. JSONSchema cannot represent non-object value: foo],
          ]
        `);
      }));

    it('should reject array value', () =>
      graphql(
        schema,
        /* GraphQL */ `
          query ($arg: JSONSchema!) {
            value(arg: $arg)
          }
        `,
        null,
        null,
        {
          arg: [],
        },
      ).then(({ data, errors }) => {
        expect(data).toBeUndefined();
        expect(errors).toMatchInlineSnapshot(`
          Array [
            [GraphQLError: Variable "$arg" got invalid value []; Expected type JSONSchema. JSONSchema cannot represent non-object value: ],
          ]
        `);
      }));
  });

  describe('parseLiteral', () => {
    it('should support parsing literals', () =>
      graphql(
        schema,
        /* GraphQL */ `
          {
            value(
              arg: {
                type: "object"
                properties: {
                  name: { type: "string", pattern: "^w+$" }
                  value: { type: "string" }
                }
                additionalProperties: false
                required: ["name", "value"]
              }
            )
          }
        `,
      ).then(({ data, errors }) => {
        expect(data.value).toEqual({
          type: 'object',
          properties: {
            name: { type: 'string', pattern: '^w+$' },
            value: { type: 'string' },
          },
          additionalProperties: false,
          required: ['name', 'value'],
        });
        expect(errors).toBeUndefined();
      }));

    it('should reject string literal', () =>
      graphql(
        schema,
        /* GraphQL */ `
          {
            value(arg: "foo")
          }
        `,
      ).then(({ data, errors }) => {
        expect(data).toBeUndefined();
        expect(errors).toMatchInlineSnapshot(`
          Array [
            [GraphQLError: Expected type JSONSchema, found "foo"; JSONSchema must be an object: "foo"],
          ]
        `);
      }));

    it('should reject array literal', () =>
      graphql(
        schema,
        /* GraphQL */ `
          {
            value(arg: [])
          }
        `,
      ).then(({ data, errors }) => {
        expect(data).toBeUndefined();
        expect(errors).toMatchInlineSnapshot(`
          Array [
            [GraphQLError: Expected type JSONSchema, found []; JSONSchema must be an object: []],
          ]
        `);
      }));

    it('should reject an invalid JSON schema', () =>
      graphql(
        schema,
        /* GraphQL */ `
          {
            value(
              arg: {
                type: "object"
                properties: {
                  name: { type: "string" }
                  invalidProp: { type: "invalid", default: false }
                }
                additionalProperties: false
              }
            )
          }
        `,
      ).then(({ data, errors }) => {
        expect(data).toBeUndefined();
        const err = extractError(errors[0]);
        expect(err.message).toBe('Invalid JSON Schema');
      }));
  });
});
