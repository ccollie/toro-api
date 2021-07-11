/**
 * Copyright (c) 2017, Dirk-Jan Rutten
 * All rights reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 */
import { GraphQLScalarType, Kind } from 'graphql';
import type { GraphQLScalarTypeConfig } from 'graphql';
import { parse as parseDateMath } from '@lib/parse-date-math';
import { parseISO } from 'date-fns'; // eslint-disable-line

function isValidDate(date: unknown): boolean {
  return date instanceof Date && !isNaN(date.valueOf());
}

function parseTimestamp(value: number): Date {
  try {
    return new Date(value);
  } catch (e) {
    throw new TypeError(
      'DateTime cannot represent an invalid Unix timestamp ' + value,
    );
  }
}

export const GraphQLDateTimeConfig: GraphQLScalarTypeConfig<Date, Date> =
  /*#__PURE__*/ {
    name: 'DateTime',
    description:
      'An ISO date-time string, such as 2007-12-03T10:15:30Z. ' +
      'Also handles Elastic compatible date-math expressions: ' +
      // eslint-disable-next-line max-len
      ' https://www.elastic.co/guide/en/elasticsearch/reference/current/common-options.html#date-math.',
    serialize(value) {
      if (value instanceof Date) {
        if (isValidDate(value)) {
          return value;
        }
        throw new TypeError(
          'DateTime cannot represent an invalid Date instance',
        );
      } else if (typeof value === 'string') {
        const val = parseISO(value);
        if (isValidDate(val)) {
          return val;
        }

        const v = parseDateMath(value);
        if (isValidDate(v)) {
          return v;
        }

        throw new TypeError(
          `DateTime cannot represent an invalid date-time-string ${value}.`,
        );
      } else if (typeof value === 'number') {
        return parseTimestamp(value);
      } else {
        throw new TypeError(
          'DateTime cannot be serialized from a non string, ' +
            'non numeric or non Date type ' +
            JSON.stringify(value),
        );
      }
    },
    parseValue(value) {
      if (value instanceof Date) {
        if (isValidDate(value)) {
          return value;
        }
        throw new TypeError(
          'DateTime cannot represent an invalid Date instance',
        );
      }
      if (typeof value === 'number') {
        return parseTimestamp(value);
      }
      if (typeof value === 'string') {
        const val = parseISO(value);
        if (isValidDate(val)) {
          return val;
        }

        const v = parseDateMath(value);
        if (isValidDate(v)) {
          return v;
        }

        throw new TypeError(
          `DateTime cannot represent an invalid date-time-string ${value}.`,
        );
      }
      throw new TypeError(
        `DateTime cannot represent non string or Date type ${JSON.stringify(
          value,
        )}`,
      );
    },
    parseLiteral(ast) {
      if (ast.kind === Kind.INT) {
        return parseTimestamp(parseInt(ast.value, 10));
      }
      if (ast.kind !== Kind.STRING) {
        throw new TypeError(
          `DateTime cannot represent non string or Date type ${
            'value' in ast && ast.value
          }`,
        );
      }
      const { value } = ast;
      const val = parseISO(value);
      if (isValidDate(val)) {
        return val;
      }

      const v = parseDateMath(value);
      if (isValidDate(v)) {
        return v;
      }

      throw new TypeError(
        `DateTime cannot represent an invalid date-time-string ${String(
          value,
        )}.`,
      );
    },
  };

/**
 * An RFC ISO-8601 compliant date-time scalar.
 *
 * Input:
 *    This scalar takes an RFC ISO-8601 date-time string as input and
 *    parses it to a javascript Date.
 *
 * Output:
 *    This scalar serializes javascript Dates,
 *    RFC ISO-8601 date-time strings, unix timestamps and simple ElasticSearch date expressions
 *    https://www.elastic.co/guide/en/elasticsearch/reference/current/common-options.html#date-math
 *    to RFC 3339 UTC date-time strings.
 */
export const GraphQLDateTime = /*#__PURE__*/ new GraphQLScalarType(
  GraphQLDateTimeConfig,
);
