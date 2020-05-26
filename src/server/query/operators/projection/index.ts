/**
 * Projection Operators. https://docs.mongodb.com/manual/reference/operator/projection/
 */
import { assert, EvalFunc, slice } from '../../utils';
import { isNumber } from 'lodash';
import { compileQuery, parseExpression } from '../../internal';

/**
 * Projects the first element in an array that matches the query condition.
 *
 * @param field
 * @param expr
 */
export function $(expr, field) {
  throw new Error('$ not implemented');
}

/**
 * Projects only the first element from an array that matches the specified $elemMatch condition.
 *
 * @param field
 * @param expr
 * @param context
 * @returns {*}
 */
export function $elemMatch(expr, field: string, context): EvalFunc {
  const predicate = compileQuery(expr, context);
  const resolve = context.getFieldResolver(field);

  return (obj, ctx): any => {
    const arr = resolve(obj, field);
    assert(Array.isArray(arr), '$elemMatch: invalid argument');

    for (let i = 0; i < arr.length; i++) {
      if (predicate(arr[i], ctx)) {
        return [arr[i]];
      }
    }

    return undefined;
  };
}

/**
 * Limits the number of elements projected from an array. Supports skip and limit slices.
 *
 * @param field
 * @param expr
 * @param context
 */
export function $slice(expr, field: string, context): EvalFunc {
  const compiled = parseExpression(context, expr);
  const resolve = context.getFieldResolver(field);

  return (obj, ctx): any[] => {
    const xs = resolve(obj, field);

    if (!Array.isArray(xs)) return xs;

    const expr = compiled(obj, ctx);
    if (Array.isArray(expr)) {
      return slice(xs, expr[0], expr[1]);
    } else {
      assert(isNumber(expr), '$slice: invalid arguments for projection');
      return slice(xs, expr);
    }
  };
}
