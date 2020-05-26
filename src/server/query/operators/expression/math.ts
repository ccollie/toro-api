import { QueryContext } from '../../queryContext';
import { EvalFunc, isArray } from '../../utils';
import { assert } from '../../utils';
import { parseExpression } from '../../internal';
import { isNil, isNumber } from 'lodash';

/**
 * Returns an average of all the values in a group.
 *
 * @param expr
 * @param context
 * @returns {*}
 */
export function $avg(expr: any, context: QueryContext): EvalFunc {
  if (isNumber(expr)) {
    // take a short cut if expr is number literal
    return (): number => expr;
  }
  const exec = parseExpression(context, expr);

  return (obj): number => {
    const items = exec(obj);
    if (isNil(items)) return undefined;
    if (isNumber(items)) return items;
    assert(Array.isArray(items), '$avg expects an array of numbers');

    let count = 0;
    let sum = 0;
    for (let i = 0; i < items.length; i++) {
      const val = items[i];
      if (isNumber(val)) {
        sum += val;
        count++;
      }
    }

    return count === 0 ? 0 : sum / count;
  };
}

/**
 * Returns the highest value in a group.
 *
 * @param expr
 * @param context
 * @returns {*}
 */
export function $max(expr: any, context: QueryContext): EvalFunc {
  if (isNumber(expr)) {
    // take a short cut if expr is number literal
    return (): number => expr;
  }

  const exec = parseExpression(context, expr);

  return (obj): number | undefined => {
    const items = exec(obj);
    if (isNil(items)) return undefined;
    if (isNumber(items)) return items;
    assert(Array.isArray(items), '$max expects an array of numbers');
    return items.reduce(
      (acc, n) => (isNil(acc) || n > acc ? n : acc),
      undefined,
    );
  };
}

/**
 * Returns the lowest value in a group.
 *
 * @param expr
 * @param context
 * @returns {*}
 */
export function $min(expr: any, context: QueryContext): EvalFunc {
  if (isNumber(expr)) {
    // take a short cut if expr is number literal
    return (): number => expr;
  }

  const exec = parseExpression(context, expr);

  return (obj): number | undefined => {
    const collection = exec(obj);
    if (isNil(collection)) return undefined;
    if (isNumber(collection)) return collection;

    assert(Array.isArray(collection), '$min expects an array of numbers');
    return collection.reduce(
      (acc, n) => (isNil(acc) || n < acc ? n : acc),
      undefined,
    );
  };
}

/**
 * Returns the sum of all the values in a group.
 *
 * @param expr
 * @param context
 * @returns {*}
 */
export function $sum(expr: any, context: QueryContext): EvalFunc {
  if (isNumber(expr)) {
    // take a short cut if expr is number literal
    return (): number => expr;
  }

  const exec = parseExpression(context, expr);

  return (obj): number => {
    const collection = exec(obj);
    if (isNumber(collection)) return collection;
    if (!isArray(collection)) return 0;
    return collection.reduce((acc, n) => acc + (isNumber(n) ? n : 0), 0);
  };
}
