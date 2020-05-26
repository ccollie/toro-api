import { assert, compare, CompareResult, EvalFunc } from '../../utils';
import { parseExpression } from '../utils';

import {
  $eq as __eq,
  $gt as __gt,
  $gte as __gte,
  $lt as __lt,
  $lte as __lte,
  $ne as __ne,
} from '../predicates';

import { QueryContext } from '../../queryContext';

function createComparison(f) {
  return (expr: any, context: QueryContext) => {
    const exec = parseExpression(context, expr);

    return (obj, ctx): boolean => {
      const args = exec(obj, ctx);
      assert(
        Array.isArray(args) && args.length === 2,
        'comparison expects 2 arguments',
      );
      return f(args[0], args[1]);
    };
  };
}

export const $eq = createComparison(__eq);
export const $gt = createComparison(__gt);
export const $gte = createComparison(__gte);
export const $lt = createComparison(__lt);
export const $lte = createComparison(__lte);
export const $ne = createComparison(__ne);

/**
 * Compares two values and returns the result of the comparison as an integer.
 *
 * @param expr
 * @param {QueryContext} context
 * @returns {number}
 */
export function $cmp(expr: any, context: QueryContext): EvalFunc {
  const exec = parseExpression(context, expr);

  return (obj): CompareResult => {
    const args = exec(obj);
    assert(
      Array.isArray(args) && args.length === 2,
      '$cmp expects 2 arguments',
    );

    return compare(args[0], args[1]);
  };
}
