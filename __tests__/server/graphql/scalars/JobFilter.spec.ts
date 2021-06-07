import { get } from 'lodash';
import { graphql, GraphQLInt, GraphQLObjectType, GraphQLSchema } from 'graphql';

// eslint-disable-next-line import/no-named-as-default
import { GraphQLJobFilterQuery } from '@server/graphql/resolvers/scalars';

const INVALID_FILTER = { $invalid: [234], '<': 30 };

const FIXTURE = { 'data.region': { $eq: 'us-east-1' } };

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

describe('GraphQLJobFilterQuery', () => {
  let schema;

  beforeEach(() => {
    schema = createSchema(GraphQLJobFilterQuery);
  });

  describe('serialize', () => {
    it('should support serialization', async () => {
      const { data, errors } = await graphql(
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

    it('should parse a valid string filter', async () => {
      const { data, errors } = await graphql(
        schema,
        /* GraphQL */ `
          query {
            rootValue
          }
        `,
        JSON.stringify(FIXTURE),
      );
      expect(data.rootValue).toEqual(FIXTURE);
      expect(errors).toBeUndefined();
    });

    it('should reject invalid string values', async () => {
      const { data, errors } = await graphql(
        schema,
        /* GraphQL */ `
          query {
            rootValue
          }
        `,
        'foo',
      );
      expect(data.rootValue).toBeNull();
      expect(errors).toMatchInlineSnapshot(`
        Array [
          [GraphQLError: JobFilterQuery cannot represent non-object value: foo],
        ]
      `);
    });

    it('should reject array values', async () => {
      const { data, errors } = await graphql(
        schema,
        /* GraphQL */ `
          query {
            rootValue
          }
        `,
        [],
      );

      expect(data.rootValue).toBeNull();
      expect(errors).toMatchInlineSnapshot(`
          Array [
            [GraphQLError: Invalid filter query],
          ]
        `);
    });
  });

  describe('parseValue', () => {
    it('should support parsing a valid filter', async () => {
      const { data, errors } = await graphql(
        schema,
        /* GraphQL */ `
          query ($arg: JobFilterQuery!) {
            value(arg: $arg)
          }
        `,
        null,
        null,
        {
          arg: FIXTURE,
        },
      );
      expect(data.value).toEqual(FIXTURE);
      expect(errors).toBeUndefined();
    });

    it('should fail on invalid filter expression', async () => {
      const { data, errors } = await graphql(
        schema,
        /* GraphQL */ `
          query ($arg: JobFilterQuery!) {
            value(arg: $arg)
          }
        `,
        null,
        null,
        {
          arg: INVALID_FILTER,
        },
      );
      expect(data).toBeUndefined();
      expect(errors).not.toBeUndefined();
      const err = extractError(errors[0]);
      expect(err.message).toBe('Invalid filter query');
    });

    it('should reject string value', async () => {
      const { data, errors } = await graphql(
        schema,
        /* GraphQL */ `
          query ($arg: JobFilterQuery!) {
            value(arg: $arg)
          }
        `,
        null,
        null,
        {
          arg: 'foo',
        },
      );
      expect(data).toBeUndefined();
      expect(errors).toMatchInlineSnapshot(`
          Array [
            [GraphQLError: Variable "$arg" got invalid value "foo"; Expected type JobFilterQuery. JobFilterQuery cannot represent non-object value: foo],
          ]
        `);
    });

    it('should reject array value', async () => {
      const { data, errors } = await graphql(
        schema,
        /* GraphQL */ `
          query ($arg: JobFilterQuery!) {
            value(arg: $arg)
          }
        `,
        null,
        null,
        {
          arg: [],
        },
      );
      expect(data).toBeUndefined();
      expect(errors).toMatchInlineSnapshot(`
        Array [
          [GraphQLError: Variable "$arg" got invalid value []; Expected type JobFilterQuery. Invalid filter query],
        ]
      `);
    });
  });

  describe('parseLiteral', () => {
    it('should support parsing literals', async () => {
      const criteria = {
        timestamp: { $lte: 10000 },
        'data.region': { $eq: 'us-east-1' },
        latency: { $gte: 100 },
        returnvalue: { $eq: 200 },
      };

      const source = `
          query {
            value(
              arg: {
                timestamp: { lte: 10000 },
                "data.region": { eq: "us-east-1" },
                latency: { "gte: 100 },
                returnvalue: { "eq": 200 }
              }
            )
          }
        `;
      const { data, errors } = await graphql(schema, source);
      expect(data.value).toEqual(criteria);
      expect(errors).toBeUndefined();
    });

    it('should reject an invalid string literal', async () => {
      const { data, errors } = await graphql(
        schema,
        /* GraphQL */ `
          {
            value(arg: "foo")
          }
        `,
      );
      expect(data).toBeUndefined();
      expect(errors).toMatchInlineSnapshot(`
        Array [
          [GraphQLError: Expected type JobFilterQuery, found "foo"; JobFilterQuery cannot represent non-object value: foo],
        ]
      `);
    });

    it('should reject array literals', async () => {
      const { data, errors } = await graphql(
        schema,
        /* GraphQL */ `
          {
            value(arg: [])
          }
        `,
      );
      expect(data).toBeUndefined();
      expect(errors).toMatchInlineSnapshot(`
        Array [
          [GraphQLError: Expected type JobFilterQuery, found []; JobFilterQuery must be an object: []],
        ]
      `);
    });

    it('should reject an invalid filter query', async () => {
      const { data, errors } = await graphql(
        schema,
        /* GraphQL */ `
          {
            value(
              arg: ${INVALID_FILTER}
            )
          }
        `,
      );
      expect(data).toBeUndefined();
      expect(errors.length).toBe(1);
    });
  });
});
