// Query Logical Operators:
// https://docs.mongodb.com/manual/reference/operator/query-logical/
import { assert, normalize, QueryEvalFunc } from '../../utils';
import { each } from 'lodash';
import { compileQuery } from '../utils';
import { QueryContext } from '../../queryContext';

/**
 * Joins query clauses with a logical OR returns all documents that match the
 * conditions of either clause.
 *
 * @param {QueryContext} context
 * @param {string} selector
 * @param value
 * @returns {Function}
 */
export function $or(
  context: QueryContext,
  selector: string,
  value,
): QueryEvalFunc {
  assert(
    Array.isArray(value),
    'Invalid expression. $or expects value to be an Array',
  );

  const queries = [];
  each(value, (expr) => queries.push(compileQuery(expr, context)));

  return (obj, ctx): boolean => {
    for (let i = 0; i < queries.length; i++) {
      if (queries[i](obj, ctx)) {
        return true;
      }
    }
    return false;
  };
}

/**
 * Joins query clauses with a logical AND returns all documents that match
 * the conditions of both clauses.
 *
 * @param {QueryContext} context
 * @param {string} selector
 * @param value
 * @returns {Function}
 */
export function $and(
  context: QueryContext,
  selector: string,
  value,
): QueryEvalFunc {
  assert(
    Array.isArray(value),
    'Invalid expression: $and expects value to be an Array',
  );

  const queries = [];
  each(value, (expr) => queries.push(compileQuery(expr, context)));

  return (obj, ctx): boolean => {
    for (let i = 0; i < queries.length; i++) {
      if (!queries[i](obj, ctx)) {
        return false;
      }
    }
    return true;
  };
}

/**
 * Joins query clauses with a logical NOR returns all documents that fail to match both clauses.
 *
 * @param {QueryContext} context
 * @param {string} selector
 * @param value
 * @returns {Function}
 */
export function $nor(
  context: QueryContext,
  selector: string,
  value,
): QueryEvalFunc {
  assert(
    Array.isArray(value),
    'Invalid expression. $nor expects value to be an Array',
  );
  const f = $or(context, '$or', value);
  return (obj, ctx): boolean => !f(obj, ctx);
}

/**
 * Inverts the effect of a query expression and returns documents that do not match
 * the query expression.
 *
 * @param {QueryContext} context
 * @param {String} selector
 * @param value
 * @returns {Function}
 */
export function $not(
  context: QueryContext,
  selector: string,
  value,
): QueryEvalFunc {
  const criteria = {};
  criteria[selector] = normalize(value);
  const predicate = compileQuery(context, criteria);
  return (obj, ctx): boolean => !predicate(obj, ctx);
}
