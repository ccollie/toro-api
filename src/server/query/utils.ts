/**
 * Utility constants and functions
 */
import { each, keys, isNil, isObject, isRegExp, isObjectLike } from 'lodash';
import { QueryContext } from './queryContext';

export const MAX_INT = 2147483647;
export const MIN_INT = -2147483648;
export const MAX_LONG = Number.MAX_SAFE_INTEGER;
export const MIN_LONG = Number.MIN_SAFE_INTEGER;

// special value to identify missing items. treated differently from undefined
// eslint-disable-next-line @typescript-eslint/no-empty-function
const MISSING = (): void => {};

// Javascript native types
export enum JsType {
  NULL = 'null',
  UNDEFINED = 'undefined',
  BOOLEAN = 'boolean',
  NUMBER = 'number',
  STRING = 'string',
  DATE = 'date',
  REGEXP = 'regexp',
  ARRAY = 'array',
  OBJECT = 'object',
  FUNCTION = 'function',
}

// no array, object, or function types
const JS_SIMPLE_TYPES = [
  JsType.NULL,
  JsType.UNDEFINED,
  JsType.BOOLEAN,
  JsType.NUMBER,
  JsType.STRING,
  JsType.DATE,
  JsType.REGEXP,
];

// MongoDB BSON types
export enum BsonType {
  BOOL = 'bool',
  INT = 'int',
  LONG = 'long',
  DOUBLE = 'double',
  DECIMAL = 'decimal',
  REGEX = 'regex',
}

// Generic callback
export interface Callback<T> {
  (...args: any): T;
}

// Generic predicate
export interface Predicate<T> {
  (...args: T[]): boolean;
}

export interface EvalFunc {
  (obj?: any, ctx?: any): any;
}

export interface QueryEvalFunc {
  (obj?: any, ctx?: any): boolean;
}

/**
 * An expression operator function. It parses the expression expr and returns
 * an {@link EvalFunc} which is what actually is called at runtime
 * */
export interface ExpressionOperator {
  (expr: any, context: QueryContext): EvalFunc;
}

// Result of comparator function
export type CompareResult = -1 | 0 | 1;

// Generic comparator callback
export interface Comparator<T> {
  (left: T, right: T): CompareResult;
}

/**
 * Default compare function
 * @param {*} a
 * @param {*} b
 */
export function compare(a: any, b: any): CompareResult {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function err(s): void {
  throw new Error(s);
}

export function assert(condition: boolean, message: string): void {
  if (!condition) err(message);
}

/**
 * Returns the name of type of value given by its constructor.
 * If missing returns "null" or "undefined" their respective values.
 * @param v A value
 */
export function getType(v: any): string {
  if (v === null) return 'Null';
  if (v === undefined) return 'Undefined';
  return v.constructor.name;
}

export function getJsType(v: any): string {
  return getType(v).toLowerCase();
}

export const isArray = Array.isArray || ((v) => v instanceof Array);

export function inArray(arr: any[], item: any): boolean {
  return arr.includes(item);
}

export function notInArray(arr: any[], item: any): boolean {
  return !inArray(arr, item);
}

export function ensureArray(x: any): any[] {
  return Array.isArray(x) ? x : [x];
}

export function has(obj: object, prop: any): boolean {
  return !!obj && obj.hasOwnProperty(prop);
}

export function isEmpty(x: any): boolean {
  return (
    isNil(x) ||
    (isArray(x) && x.length === 0) ||
    (isObject(x) && keys(x).length === 0) ||
    !x
  );
}

const OPERATOR_NAME_PATTERN = /^\$[a-zA-Z0-9_]+$/;

/**
 * Check whether the given name passes for an operator. We assume any field name
 * starting with '$' is an operator. This is cheap and safe to do since keys beginning
 * with '$' should be reserved for internal use.
 * @param {String} name
 */
export function isOperator(name: string): boolean {
  return OPERATOR_NAME_PATTERN.test(name);
}

/**
 * Simplify expression for easy evaluation with query operators map
 * @param expr
 * @returns {*}
 */
export function normalize(expr: any): any {
  // normalized primitives
  if (inArray(JS_SIMPLE_TYPES, getType(expr).toLowerCase())) {
    return isRegExp(expr) ? { $regex: expr } : { $eq: expr };
  }

  // normalize object expression
  if (isObjectLike(expr)) {
    const exprKeys = keys(expr);

    // no valid query operator found, so we do simple comparison
    if (!exprKeys.some(isOperator)) {
      return { $eq: expr };
    }

    // ensure valid regex
    if (has(expr, '$regex')) {
      expr['$regex'] = new RegExp(expr['$regex'], expr['$options']);
      delete expr['$options'];
    }
  }

  return expr;
}

/**
 * Returns a slice of the array
 *
 * @param  {Array} xs
 * @param  {Number} skip
 * @param  {Number} limit
 * @return {Array}
 */
export function slice(
  xs: any[],
  skip: number,
  limit: number = undefined,
): any[] {
  // MongoDB $slice works a bit differently from Array.slice
  // Uses single argument for 'limit' and array argument [skip, limit]
  if (isNil(limit)) {
    if (skip < 0) {
      skip = Math.max(0, xs.length + skip);
      limit = xs.length - skip + 1;
    } else {
      limit = skip;
      skip = 0;
    }
  } else {
    if (skip < 0) {
      skip = Math.max(0, xs.length + skip);
    }
    assert(
      limit > 0,
      'Invalid argument value for $slice operator. Limit must be a positive number',
    );
    limit += skip;
  }
  return xs.slice(skip, limit);
}

/**
 * Filter out all MISSING values from the object in-place
 * @param {Object} obj The object the filter
 */
export function filterMissing(obj: object): object {
  if (Array.isArray(obj)) {
    for (let i = obj.length - 1; i >= 0; i--) {
      if (obj[i] === MISSING) {
        obj.splice(i, 1);
      } else {
        filterMissing(obj[i]);
      }
    }
  } else if (isObject(obj)) {
    for (const k in obj) {
      if (obj.hasOwnProperty(k)) {
        filterMissing(obj[k]);
      }
    }
  }
  return obj;
}

// Options to merge function
interface MergeOptions {
  flatten?: boolean;
}

/**
 * Deep merge objects or arrays.
 * When the inputs have unmergeable types, the source value (right hand side) is returned.
 * If inputs are arrays of same length and all elements are mergable, elements in the same
 * position are merged together. If any of the elements are unmergeable, elements in the source
 * are appended to the target.
 * @param target {Object|Array} the target to merge into
 * @param obj {Object|Array} the source object
 * @param {MergeOptions} options
 */
export function merge(
  target: object,
  obj: object,
  options?: MergeOptions,
): object {
  // take care of missing inputs
  if (target === MISSING) return obj;
  if (obj === MISSING) return target;

  const inputs = [target, obj];

  if (!(inputs.every(isObject) || inputs.every(isArray))) {
    throw Error('mismatched types. must both be array or object');
  }

  // default options
  options = options || { flatten: false };

  if (isArray(target)) {
    const result = target as any[];
    const input = obj as any[];

    if (options.flatten) {
      let i = 0;
      let j = 0;
      while (i < result.length && j < input.length) {
        result[i] = merge(result[i++], input[j++], options);
      }
      while (j < input.length) {
        result.push(obj[j++]);
      }
    } else {
      Array.prototype.push.apply(result, input);
    }
  } else {
    Object.keys(obj).forEach((k) => {
      if (has(target, k)) {
        target[k] = merge(target[k], obj[k], options);
      } else {
        target[k] = obj[k];
      }
    });
  }

  return target;
}

/**
 * Retrieve the value of a given key on an object
 * @param obj
 * @param field
 * @returns {*}
 * @private
 */
export function getValue(obj: any, field: any): any {
  return isObjectLike(obj) ? obj[field] : undefined;
}

/**
 * Walk the object graph and execute the given transform function
 *
 * @param  {Object|Array} obj   The object to traverse
 * @param  {String} selector    The selector
 * @param  {Function} fn Function to execute for value at the end the traversal
 * @param  {Boolean} force Force generating missing parts of object graph
 * @return {*}
 */
export function traverse(
  obj: object,
  selector: string,
  fn: Callback<void>,
  force?: boolean,
): void {
  const names = selector.split('.');
  const key = names[0];
  const next = names.slice(1).join('.');

  if (names.length === 1) {
    fn(obj, key);
  } else {
    // force the rest of the graph while traversing
    if (force === true && isNil(obj[key])) {
      obj[key] = {};
    }
    traverse(obj[key], next, fn, force);
  }
}

/**
 * Set the value of the given object field
 *
 * @param obj {Object|Array} the object context
 * @param selector {String} path to field
 * @param value {*} the value to set
 */
export function setValue(obj: object, selector: string, value: any): void {
  traverse(
    obj,
    selector,
    (item: object, key: any) => {
      item[key] = value;
    },
    true,
  );
}

export function removeValue(obj: any, selector: any): void {
  traverse(obj, selector, (item: any, key: any) => {
    if (item instanceof Array && /^\d+$/.test(key)) {
      item.splice(parseInt(key), 1);
    } else if (isObject(item)) {
      delete item[key];
    }
  });
}

/**
 * Encode value to string using a simple non-colliding stable scheme.
 *
 * @param value
 * @returns {*}
 */
export function encode(value: any): string {
  const type = getType(value).toLowerCase();
  switch (type) {
    case JsType.BOOLEAN:
    case JsType.NUMBER:
    case JsType.REGEXP:
      return value.toString();
    case JsType.STRING:
      return JSON.stringify(value);
    case JsType.DATE:
      return value.toISOString();
    case JsType.NULL:
    case JsType.UNDEFINED:
      return type;
    case JsType.ARRAY:
      return '[' + value.map(encode) + ']';
    default:
      const prefix = type === JsType.OBJECT ? '' : `${getType(value)}`;
      const objKeys = keys(value);
      objKeys.sort();
      return (
        `${prefix}{` +
        objKeys.map((k) => `${encode(k)}:${encode(value[k])}`) +
        '}'
      );
  }
}

// Options to resolve() and resolveGraph() functions
export interface ResolveOptions {
  unwrapArray?: boolean;
  preserveMissing?: boolean;
}

/**
 * Returns the full object to the resolved value given by the selector.
 * This function excludes empty values as they aren't practically useful.
 *
 * @param obj {Object} the object context
 * @param selector {String} dot separated path to field
 * @param options
 */
export function resolveGraph(
  obj: object,
  selector: string,
  options?: ResolveOptions,
): any {
  // options
  if (options === undefined) {
    options = { preserveMissing: false };
  }

  const names: string[] = selector.split('.');
  const key = names[0];
  // get the next part of the selector
  const next = names.slice(1).join('.');
  const isIndex = key.match(/^\d+$/) !== null;
  const hasNext = names.length > 1;
  let result: any;
  let value: any;

  if (obj instanceof Array) {
    if (isIndex) {
      result = getValue(obj, Number(key));
      if (hasNext) {
        result = resolveGraph(result, next, options);
      }
      result = [result];
    } else {
      result = [];
      each(obj, (item) => {
        value = resolveGraph(item, selector, options);
        if (options.preserveMissing) {
          if (value === undefined) {
            value = MISSING;
          }
          result.push(value);
        } else if (value !== undefined) {
          result.push(value);
        }
      });
    }
  } else {
    value = getValue(obj, key);
    if (hasNext) {
      value = resolveGraph(value, next, options);
    }
    if (value === undefined) return undefined;
    result = {};
    result[key] = value;
  }

  return result;
}

/**
 * Unwrap a single element array to specified depth
 * @param {Array} arr
 * @param {Number} depth
 */
function unwrap(arr: any[], depth: number): any[] {
  if (depth < 1) return arr;
  while (depth-- && arr.length === 1) arr = arr[0];
  return arr;
}

/**
 * Resolve the value of the field (dot separated) on the given object
 * @param obj {Object} the object context
 * @param selector {String} dot separated path to field
 * @param {ResolveOptions} options
 * @returns {*}
 */
export function resolve(
  obj: object | any[],
  selector: string,
  options?: ResolveOptions,
): any {
  let depth = 0;

  // options
  options = options || { unwrapArray: false };

  function resolve2(o: object | any[], path: string[]): any {
    let value = o;
    for (let i = 0; i < path.length; i++) {
      const field = path[i];
      const isText = field.match(/^\d+$/) === null;

      // using instanceof to aid typescript compiler
      if (isText && value instanceof Array) {
        // On the first iteration, we check if we received a stop flag.
        // If so, we stop to prevent iterating over a nested array value
        // on consecutive object keys in the selector.
        if (i === 0 && depth > 0) break;

        depth += 1;
        path = path.slice(i);
        value = value.reduce<any[]>((acc: any[], item: any) => {
          const v = resolve2(item, path);
          if (v !== undefined) acc.push(v);
          return acc;
        }, []);
        break;
      } else {
        value = getValue(value, field);
      }
      if (value === undefined) break;
    }
    return value;
  }

  obj = inArray(JS_SIMPLE_TYPES, getType(obj).toLowerCase())
    ? obj
    : resolve2(obj, selector.split('.'));

  return obj instanceof Array && options.unwrapArray ? unwrap(obj, depth) : obj;
}
