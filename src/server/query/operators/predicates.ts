/**
 * Query and Projection Operators. https://docs.mongodb.com/manual/reference/operator/query/
 */
import {
  JsType,
  getType,
  ensureArray,
  isOperator,
  BsonType,
  MAX_LONG,
  MIN_LONG,
  MIN_INT,
  MAX_INT,
  QueryEvalFunc,
} from '../utils';

import {
  flatten,
  intersection,
  isEmpty,
  isEqual,
  isNil,
  isNull,
  isNumber,
  isObject,
  isString,
  isBoolean,
  isRegExp,
  isDate,
  keys,
} from 'lodash';

import { QueryContext } from '../queryContext';

export function createQueryOperator(pred) {
  return (context: QueryContext, selector: string, value): QueryEvalFunc => {
    const resolve = context.getFieldResolver(selector);
    return (obj): boolean => {
      // value of field must be fully resolved.
      const lhs = resolve(obj);
      return pred(lhs, value);
    };
  };
}

function compare(a, b, f): boolean {
  return ensureArray(a).some((x) => getType(x) === getType(b) && f(x, b));
}

/**
 * Checks that two values are equal.
 *
 * @param a         The lhs operand as resolved from the object by the given selector
 * @param b         The rhs operand provided by the user
 * @returns {*}
 */
export function $eq(a: any, b: any): boolean {
  // start with simple equality check
  if (isEqual(a, b)) return true;

  // https://docs.mongodb.com/manual/tutorial/query-for-null-fields/
  if (isNil(a) && isNil(b)) return true;

  // check
  if (Array.isArray(a)) {
    const eq = isEqual.bind(null, b);
    return a.some(eq) || flatten(a).some(eq);
  }

  return false;
}

/**
 * Matches all values that are not equal to the value specified in the query.
 *
 * @param a
 * @param b
 * @returns {boolean}
 */
export function $ne(a: any, b: any): boolean {
  return !$eq(a, b);
}

/**
 * Matches any of the values that exist in an array specified in the query.
 *
 * @param a
 * @param b
 * @returns {*}
 */
export function $in(a: any, b: any): boolean {
  // queries for null should be able to find undefined fields
  if (isNil(a)) return b.some(isNull);

  return intersection(ensureArray(a), b).length > 0;
}

/**
 * Matches values that do not exist in an array specified to the query.
 *
 * @param a
 * @param b
 * @returns {*|boolean}
 */
export function $nin(a: any, b: any): boolean {
  return !$in(a, b);
}

/**
 * Matches values that are less than the value specified in the query.
 *
 * @param a
 * @param b
 * @returns {boolean}
 */
export function $lt(a: any, b: any): boolean {
  return compare(a, b, (x, y) => x < y);
}

/**
 * Matches values that are less than or equal to the value specified in the query.
 *
 * @param a
 * @param b
 * @returns {boolean}
 */
export function $lte(a: any, b: any): boolean {
  return compare(a, b, (x, y) => x <= y);
}

/**
 * Matches values that are greater than the value specified in the query.
 *
 * @param a
 * @param b
 * @returns {boolean}
 */
export function $gt(a: any, b: any): boolean {
  return compare(a, b, (x, y) => x > y);
}

/**
 * Matches values that are greater than or equal to the value specified in the query.
 *
 * @param a
 * @param b
 * @returns {boolean}
 */
export function $gte(a: any, b: any): boolean {
  return compare(a, b, (x, y) => x >= y);
}

/**
 * Performs a modulo operation on the value of a field and selects documents
 * with a specified result.
 *
 * @param a
 * @param b
 * @returns {boolean}
 */
export function $mod(a: any, b: any): boolean {
  return ensureArray(a).some(
    (x) =>
      isNumber(x) && Array.isArray(b) && b.length === 2 && x % b[0] === b[1],
  );
}

/**
 * Selects documents where values match a specified regular expression.
 *
 * @param a
 * @param b
 * @returns {boolean}
 */
export function $regex(a: any, b: any): boolean {
  a = ensureArray(a);
  const match = (x): boolean => isString(x) && !!x.match(b);
  return a.some(match) || flatten(a).some(match);
}

/**
 * Matches documents that have the specified field.
 *
 * @param a
 * @param b
 * @returns {boolean}
 */
export function $exists(a: any, b: any): boolean {
  return (
    ((b === false || b === 0) && a === undefined) ||
    ((b === true || b === 1) && a !== undefined)
  );
}

/**
 * Selects documents if the array field is a specified size.
 *
 * @param a
 * @param b
 * @returns {*|boolean}
 */
export function $size(a: any, b: any): boolean {
  return Array.isArray(a) && isNumber(b) && a.length === b;
}

export const $startsWith = (filter, value) =>
  isString(filter) && // todo: toString()
  isString(value) &&
  value.startsWith(filter);

export const $endsWith = (filter, value) =>
  isString(filter) && // todo: toString()
  isString(value) &&
  value.endsWith(filter);

let Query;

/**
 * Selects documents if element in the array field matches all the specified $elemMatch condition.
 *
 * @param a {Array} element to match against
 * @param b {Object} subquery
 */
export function $elemMatch(a: any, b: any): boolean {
  // ugly!!!
  Query = Query || require('../index');

  if (Array.isArray(a) && !isEmpty(a)) {
    let format = (x) => x;
    let criteria = b;

    // If we find an operator in the subquery, we fake a field to point to it.
    // This is an attempt to ensure that it a valid criteria.
    if (keys(b).every(isOperator)) {
      criteria = { temp: b };
      format = (x) => ({ temp: x });
    }
    const query = new Query(criteria);
    for (let i = 0, len = a.length; i < len; i++) {
      if (query.test(format(a[i]))) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Matches arrays that contain all elements specified in the query.
 *
 * @param a
 * @param b
 * @returns boolean
 */
export function $all(a: any, b: any): boolean {
  let matched = false;
  if (Array.isArray(a) && Array.isArray(b)) {
    for (let i = 0, len = b.length; i < len; i++) {
      if (isObject(b[i]) && !!b[i].$elemMatch) {
        matched = matched || $elemMatch(a, b[i].$elemMatch);
      } else {
        // order of arguments matter
        return intersection(b, a).length === len;
      }
    }
  }
  return matched;
}

/**
 * Selects documents if a field is of the specified type.
 *
 * @param a
 * @param b
 * @returns {boolean}
 */
export function $type(a: any, b: number | string): boolean {
  switch (b) {
    case 1:
    case 19:
    case BsonType.DOUBLE:
    case BsonType.DECIMAL:
      return isNumber(a);
    case 2:
    case JsType.STRING:
      return isString(a);
    case 3:
    case JsType.OBJECT:
      return isObject(a);
    case 4:
    case JsType.ARRAY:
      return Array.isArray(a);
    case 6:
    case JsType.UNDEFINED:
      return isNil(a);
    case 8:
    case JsType.BOOLEAN:
    case BsonType.BOOL:
      return isBoolean(a);
    case 9:
    case JsType.DATE:
      return isDate(a);
    case 10:
    case JsType.NULL:
      return isNull(a);
    case 11:
    case JsType.REGEXP:
    case BsonType.REGEX:
      return isRegExp(a);
    case 16:
    case BsonType.INT:
      return (
        isNumber(a) &&
        a >= MIN_INT &&
        a <= MAX_INT &&
        a.toString().indexOf('.') === -1
      );
    case 18:
    case BsonType.LONG:
      return (
        isNumber(a) &&
        a >= MIN_LONG &&
        a <= MAX_LONG &&
        a.toString().indexOf('.') === -1
      );
    default:
      return false;
  }
}
