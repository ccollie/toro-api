// Query Array Operators: https://docs.mongodb.com/manual/reference/operator/query-array/
import { has, isOperator, QueryEvalFunc } from '../../utils';
import { compileQuery, parseExpression } from '../utils';
import { createQueryOperator, $size as __size } from '../predicates';
import { isObject, intersection } from 'lodash';
import { QueryContext } from '../../queryContext';

// Operators needing special support

/**
 * Selects documents if element in the array field matches all the specified $elemMatch condition.
 *
 * @param selector
 * @param expr
 * @param context
 */
export function $elemMatch(
  context: QueryContext,
  selector: string,
  expr,
): QueryEvalFunc {
  let format = (x) => x;
  let criteria = expr;

  const keys = Object.keys(expr);

  // If we find an operator in the subquery, we fake a field to point to it.
  // This is an attempt to ensure that it a valid criteria.
  if (keys.every(isOperator)) {
    criteria = { temp: expr };
    format = (x) => ({ temp: x });
  }

  const resolver = context.getFieldResolver(selector);
  const predicate = compileQuery(criteria, context);

  return (obj): boolean => {
    // value of field must be fully resolved.
    const arr = resolver(obj);
    if (Array.isArray(arr)) {
      for (let i = 0, len = arr.length; i < len; i++) {
        const doc = format(arr[i]);
        if (predicate(doc)) {
          return true;
        }
      }
    }
    return false;
  };
}

/**
 * Matches arrays that contain all elements specified in the query.
 *
 * @returns function(): boolean
 * @param context
 * @param selector
 * @param expr
 */
export function $all(
  context: QueryContext,
  selector: string,
  expr,
): QueryEvalFunc {
  const compiled = [];

  const b = expr;
  const elemMatches = {};
  if (Array.isArray(b)) {
    for (let i = 0, len = b.length; i < len; i++) {
      const elem = b[i];
      let func;
      const isElemMatch = isObject(elem) && has(elem, '$elemMatch');
      if (isElemMatch) {
        elemMatches[i] = true;
        func = $elemMatch(context, selector, elem.$elemMatch);
      } else {
        func = parseExpression(context, elem);
      }
      compiled.push(func);
    }
  } else {
    return (): boolean => false;
  }

  const resolver = context.getFieldResolver(selector);

  return (obj, ctx): boolean => {
    // value of field must be fully resolved.
    const a = resolver(obj);
    const b = compiled.map((fn) => fn(obj, ctx));

    let matched = false;
    if (Array.isArray(a)) {
      for (let i = 0, len = b.length; i < len; i++) {
        if (elemMatches[i]) {
          matched = matched || !!b[i];
        } else {
          // order of arguments matter
          return intersection(b, a).length === len;
        }
      }
    }
    return matched;
  };
}

export const $size = createQueryOperator(__size);
