import { QueryContext } from '../../queryContext';
import { assert, slice, has, EvalFunc } from '../../utils';
import { parseExpression } from '../utils';
import { isObject, isBoolean, isNumber, isEqual, isNil, each } from 'lodash';

/**
 * Returns the element at the specified array index.
 *
 * @param  {*} expr
 * @param {QueryContext} context
 * @return {*}
 */
export function $arrayElemAt(expr: any, context: QueryContext): EvalFunc {
  const exec = parseExpression(context, expr);

  return (obj, ctx): any => {
    let arr = exec(obj, ctx);
    assert(
      Array.isArray(arr) && arr.length === 2,
      '$arrayElemAt expression must resolve to array(2)',
    );
    assert(
      Array.isArray(arr[0]),
      'First operand to $arrayElemAt must resolve to an array',
    );
    assert(
      isNumber(arr[1]),
      'Second operand to $arrayElemAt must resolve to an integer',
    );
    const idx = arr[1];
    arr = arr[0];
    if (idx < 0 && Math.abs(idx) <= arr.length) {
      return arr[idx + arr.length];
    } else if (idx >= 0 && idx < arr.length) {
      return arr[idx];
    }
    return undefined;
  };
}

/**
 * Converts an array of key value pairs to a document.
 */
export function $arrayToObject(expr: any, context: QueryContext): EvalFunc {
  const exec = parseExpression(context, expr);

  return (obj, ctx) => {
    const arr = exec(obj, ctx);
    assert(
      Array.isArray(arr),
      '$arrayToObject expression must resolve to an array',
    );
    return arr.reduce((newObj, val) => {
      if (Array.isArray(val) && val.length === 2) {
        newObj[val[0]] = val[1];
      } else {
        assert(
          isObject(val) && has(val, 'k') && has(val, 'v'),
          '$arrayToObject expression is invalid.',
        );
        newObj[val.k] = val.v;
      }
      return newObj;
    }, {});
  };
}

/**
 * Concatenates arrays to return the concatenated array.
 *
 * @param  {*} expr
 * @param {QueryContext} context
 * @return {*}
 */
export function $concatArrays(expr: any, context: QueryContext): EvalFunc {
  const exec = parseExpression(context, expr);

  return (obj: any, ctx): any[] => {
    const arr = exec(obj, ctx);
    assert(Array.isArray(arr), '$concatArrays must resolve to an array');
    if (arr.some(isNil)) return null;
    return arr.reduce((acc, item) => acc.concat(...item), []);
  };
}

/**
 * Selects a subset of the array to return an array with only the elements that
 * match the filter condition.
 *
 * @param  {*} expr [description]
 * @param {QueryContext} context
 * @return {*}      [description]
 */
export function $filter(expr: any, context: QueryContext): EvalFunc {
  const getInput = parseExpression(context, expr.input);
  const asVar = expr['as'];
  const evalCondition = parseExpression(context, expr.cond);

  return (obj, ctx): any[] => {
    const input = getInput(obj, ctx);
    assert(
      Array.isArray(input),
      '$filter "input" expression must resolve to an array',
    );

    return input.filter((o) => {
      // inject variable
      const tempObj = {};
      tempObj['$' + asVar] = o;
      return evalCondition(tempObj, ctx) === true;
    });
  };
}

/**
 * Returns a boolean indicating whether a specified value is in an array.
 *
 * @param {Array} expr
 * @param {QueryContext} context
 */
export function $in(expr: any, context: QueryContext): EvalFunc {
  const exec = parseExpression(context, expr);

  return (obj, ctx): boolean => {
    const args = exec(obj, ctx);
    assert(Array.isArray(args) && args.length === 2, '$in expects an array(2)');
    const [val, arr] = args;
    assert(Array.isArray(arr), '$in second argument must be an array');
    return !!arr.find((x) => isEqual(x, val));
  };
}

/**
 * Returns a boolean indicating whether a specified value is NOT in an array.
 *
 * @param {Array} expr
 * @param {QueryContext} context
 */
export function $nin(expr: any, context: QueryContext): EvalFunc {
  const pred = $in(expr, context);

  return (obj, ctx): boolean => !pred(obj, ctx);
}

/**
 * Searches an array for an occurrence of a specified value and returns the
 * array index of the first occurrence. If the substring is not found, returns -1.
 *
 * @param  {*} expr
 * @param {QueryContext} context
 * @return {*}
 */
export function $indexOfArray(expr: any, context: QueryContext): EvalFunc {
  const exec = parseExpression(context, expr);

  return (obj, ctx): number => {
    const args = exec(obj, ctx);
    if (isNil(args)) return null;

    let arr = args[0];
    const searchValue = args[1];
    if (isNil(arr)) return null;

    assert(
      Array.isArray(arr),
      '$indexOfArray expression must resolve to an array.',
    );

    const start = args[2] || 0;
    let _end = args[3];
    if (isNil(_end)) _end = arr.length;
    if (start > _end) return -1;

    assert(start >= 0 && _end >= 0, '$indexOfArray expression is invalid');

    if (start > 0 || _end < arr.length) {
      arr = arr.slice(start, _end);
    }
    return arr.findIndex(isEqual.bind(null, searchValue)) + start;
  };
}

/**
 * Determines if the operand is an array. Returns a boolean.
 *
 * @param  {*}  expr
 * @param {QueryContext} context
 */
export function $isArray(expr: any, context: QueryContext): EvalFunc {
  const exec = parseExpression(context, expr);

  return (obj): boolean => {
    return Array.isArray(exec(obj));
  };
}

/**
 * Applies a sub-expression to each element of an array and returns the array of
 * resulting values in order.
 *
 * @param expr
 * @param {QueryContext} context
 * @returns {Array|*}
 */
export function $map(expr: any, context: QueryContext): EvalFunc {
  const evalInput = parseExpression(context, expr.input);
  const evalAs = parseExpression(context, expr['as']);
  const evalIn = parseExpression(context, expr['in']);

  return (obj, ctx): any[] => {
    const input = evalInput(obj, ctx);
    assert(
      Array.isArray(input),
      '$map "input" expression must resolve to an array',
    );

    // HACK: add the "as" expression as a value on the object to take advantage
    // of "resolve()" which will reduce to that value when invoked. The reference to
    // the as expression will be prefixed with "$$". But since a "$" is stripped of before
    // passing the name to "resolve()" we just need to prepend "$" to the key.
    const tempKey = '$' + evalAs(obj, expr);
    return input.map((item) => {
      obj[tempKey] = item;
      return evalIn(obj, ctx);
    });
  };
}

/**
 * Converts a document to an array of documents representing key-value pairs.
 */
export function $objectToArray(expr: any, context: QueryContext): EvalFunc {
  const exec = parseExpression(context, expr);

  return (obj, ctx): any[] => {
    const val = exec(obj, ctx);
    assert(
      isObject(val),
      '$objectToArray expression must resolve to an object',
    );
    const arr = [];
    each(val, (v, k) => arr.push({ k, v }));
    return arr;
  };
}

/**
 * Returns an array whose elements are a generated sequence of numbers.
 *
 * @param  {*} expr
 * @param {QueryContext} context
 * @return {*}
 */
export function $range(expr: any, context: QueryContext): EvalFunc {
  const getParams = parseExpression(context, expr);

  return (obj, ctx): number[] => {
    const arr = getParams(obj, ctx);
    assert(
      Array.isArray(arr) && arr.length >= 2,
      '$range input must resolve to an array',
    );
    let start = arr[0];
    const end = arr[1];
    const step = arr[2] || 1;

    const result = [];

    while ((start < end && step > 0) || (start > end && step < 0)) {
      result.push(start);
      start += step;
    }

    return result;
  };
}

/**
 * Applies an expression to each element in an array and combines them into a single value.
 *
 * @param {*} expr
 * @param {QueryContext} context
 */
export function $reduce(expr: any, context: QueryContext): EvalFunc {
  const evalInput = parseExpression(context, expr.input);
  const evalInitialValue = parseExpression(context, expr.initialValue);
  const evalIn = parseExpression(context, expr['in']);

  return (obj, ctx): any => {
    const input = evalInput(obj, ctx);
    const initialValue = evalInitialValue(obj, ctx);

    if (isNil(input)) return null;
    assert(
      Array.isArray(input),
      '$reduce "input" expression must resolve to an array',
    );
    return input.reduce(
      (acc, n) => evalIn({ $value: acc, $this: n }, ctx),
      initialValue,
    );
  };
}

/**
 * Returns an array with the elements in reverse order.

 * @param  {*} expr
 * @param {QueryContext} context
 * @return {*}
 */
export function $reverseArray(expr: any, context: QueryContext): EvalFunc {
  const getArray = parseExpression(context, expr);

  return (obj, ctx): any[] => {
    const arr = getArray(obj, ctx);
    if (isNil(arr)) return null;
    assert(
      Array.isArray(arr),
      '$reverseArray expression must resolve to an array',
    );
    const result = [...arr];
    result.reverse();
    return result;
  };
}

/**
 * Counts and returns the total the number of items in an array.
 *
 * @param expr
 * @param {QueryContext} context
 */
export function $size(expr: any, context: QueryContext): EvalFunc {
  const exec = parseExpression(context, expr);

  return (obj, ctx): number => {
    const value = exec(obj, ctx);
    return Array.isArray(value) ? value.length : undefined;
  };
}

/**
 * Returns a subset of an array.
 *
 * @param  {*} expr
 * @param {QueryContext} context
 * @return {*}
 */
export function $slice(expr: any, context: QueryContext): EvalFunc {
  const exec = parseExpression(context, expr);

  return (obj, ctx): any[] => {
    const arr = exec(obj, ctx);
    assert(Array.isArray(arr) && arr.length >= 3, '$slice expects an Array(3)');
    return slice(arr[0], arr[1], arr[2]);
  };
}

/**
 * Merge two lists together.
 *
 * Transposes an array of input arrays so that the first element of the output array
 * would be an array containing, the first element of the first input array, the first
 * element of the second input array, etc.
 *
 * @param  {*} expr
 * @param {QueryContext} context
 * @return {*}
 */
export function $zip(expr: any, context: QueryContext): EvalFunc {
  const getInputs = parseExpression(context, expr.inputs);
  const getDefaults = parseExpression(context, expr.defaults);
  const useLongestLength = expr.useLongestLength || false;
  assert(isBoolean(useLongestLength), '"useLongestLength" must be a boolean');

  return (obj, ctx): any[] => {
    const inputs = getInputs(obj, ctx);
    let defaults = getDefaults(obj, ctx);

    assert(
      Array.isArray(inputs),
      '"inputs" expression must resolve to an array',
    );
    if (Array.isArray(defaults)) {
      assert(
        !!useLongestLength,
        '"useLongestLength" must be set to true to use "defaults"',
      );
    }

    let zipCount = 0;

    for (let i = 0, len = inputs.length; i < len; i++) {
      const arr = inputs[i];

      if (isNil(arr)) return null;

      assert(
        Array.isArray(arr),
        '"inputs" expression values must resolve to an array or null',
      );

      zipCount = useLongestLength
        ? Math.max(zipCount, arr.length)
        : Math.min(zipCount || arr.length, arr.length);
    }

    const result = [];
    defaults = defaults || [];

    for (let i = 0; i < zipCount; i++) {
      const temp = inputs.map((val, index) => {
        return isNil(val[i]) ? defaults[index] || null : val[i];
      });
      result.push(temp);
    }

    return result;
  };
}

/**
 * Combines multiple documents into a single document.
 * @param {*} expr
 * @param {QueryContext} context
 */
export function $mergeObjects(expr: any, context: QueryContext): EvalFunc {
  const exec = parseExpression(context, expr);

  return (obj, ctx): object => {
    const docs = exec(obj, ctx);
    if (Array.isArray(docs)) {
      return docs.reduce((memo, o) => Object.assign(memo, o), {});
    }
    return {};
  };
}
