import { exec, extractError } from './utils';
import { GraphQLInt, GraphQLObjectType, GraphQLSchema, graphql } from 'graphql';
import { GraphQLJSONSchema } from '../';
import { JobOptionsSchema } from '@alpen/core/queues';

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

describe('GraphQLJSONSchema', () => {
  let schema;

  beforeEach(() => {
    schema = createSchema(GraphQLJSONSchema);
  });

  describe('serialize', () => {
    it('should support serialization', async () => {
      const { data, errors } = await exec(
        schema,
        /* GraphQL */ `
          query {
            rootValue
          }
        `,
        FIXTURE,
      );
      expect(data.rootValue).toEqual(FIXTURE);
      expect(errors).toBeUndefined();
    });

    it('should reject string value', () =>
      exec(
        schema,
        /* GraphQL */ `
          query {
            rootValue
          }
        `,
        'foo',
      ).then(({ data, errors }: any) => {
        expect(data.rootValue).toBeNull();
        expect(errors).toMatchInlineSnapshot(`
          Array [
            [GraphQLError: JSONSchema cannot represent non-object value: foo],
          ]
        `);
      }));

    it('should reject array value', () =>
      exec(
        schema,
        /* GraphQL */ `
          query {
            rootValue
          }
        `,
        [],
      ).then(({ data, errors }: any) => {
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
      exec(
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
      ).then(({ data, errors }: any) => {
        expect(data.value).toEqual(FIXTURE);
        expect(errors).toBeUndefined();
      }));

    it('should fail on invalid schema', () =>
      exec(
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
      ).then(({ data, errors }: any) => {
        expect(data).toBeUndefined();
        expect(errors).not.toBeUndefined();
        const err = extractError(errors[0]);
        expect(err.message).toBe('Invalid JSON Schema');
      }));

    it('should reject string value', () =>
      exec(
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
      ).then(({ data, errors }: any) => {
        expect(data).toBeUndefined();
        expect(errors).toMatchInlineSnapshot(`
          Array [
            [GraphQLError: Variable "$arg" got invalid value "foo"; Expected type JSONSchema. JSONSchema cannot represent non-object value: foo],
          ]
        `);
      }));

    it('should reject array value', () =>
      exec(
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
      graphql({
        schema,
        source:
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
        `
      }).then(({ data, errors }: any) => {
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
      exec(
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
      exec(
        schema,
        /* GraphQL */ `
          {
            value(arg: [])
          }
        `,
      ).then(({ data, errors }: any) => {
        expect(data).toBeUndefined();
        expect(errors).toMatchInlineSnapshot(`
          Array [
            [GraphQLError: Expected type JSONSchema, found []; JSONSchema must be an object: []],
          ]
        `);
      }));

    it('should reject an invalid JSON schema', () =>
      exec(
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
      ).then(({ data, errors }: any) => {
        expect(data).toBeUndefined();
        const err = extractError(errors[0]);
        expect(err.message).toBe('Invalid JSON Schema');
      }));
  });
});
