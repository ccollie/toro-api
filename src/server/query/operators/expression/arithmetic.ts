import { QueryContext } from '../../queryContext';
import { assert, EvalFunc } from '../../utils';
import { parseExpression } from '../utils';
import { isNil, isDate, isNumber } from 'lodash';

function handleSingleParamFn(
  name: string,
  expr: any,
  context: QueryContext,
  fn: (val: number) => number,
): EvalFunc {
  const exec = parseExpression(context, expr);

  if (isNumber(expr)) {
    const value = fn(expr);
    return (): any => value;
  }

  return (obj): number => {
    const val = exec(obj);
    if (isNil(val)) return null;
    assert(
      isNumber(val) || isNaN(val),
      name + ' expression must resolve to a number.',
    );
    return fn(val);
  };
}

/**
 * Returns the absolute value of a number.
 * https://docs.mongodb.com/manual/reference/operator/aggregation/abs/#exp._S_abs
 *
 * @param expr
 * @param {QueryContext} context
 * @return {Number|null|NaN}
 */
export function $abs(expr: any, context: QueryContext): EvalFunc {
  const exec = parseExpression(context, expr);
  if (isNumber(expr)) {
    const val = Math.abs(expr);
    return () => val;
  }

  return (obj): number => {
    const val = exec(obj);
    if (isNil(val)) return null;
    assert(
      isNumber(val) || isNaN(val),
      '$abs expression must resolve to a number.',
    );
    return Math.abs(val);
  };
}

/**
 * Computes the sum of an array of numbers.
 *
 * @param expr
 * @param {QueryContext} context
 * @returns {Object}
 */
export function $add(expr: any, context: QueryContext): EvalFunc {
  const exec = parseExpression(context, expr);

  return (obj): number => {
    let foundDate = false;
    const args = exec(obj);
    const result = args.reduce((acc, val) => {
      if (isDate(val)) {
        assert(!foundDate, '"$add" can only have one date value');
        foundDate = true;
        val = val.getTime();
      }
      // assume val is a number
      acc += val;
      return acc;
    }, 0);
    return foundDate ? new Date(result) : result;
  };
}

/**
 * Returns the smallest integer greater than or equal to the specified number.
 *
 * @param expr
 * @param {QueryContext} context
 * @returns {number}
 */
export function $ceil(expr: any, context: QueryContext): EvalFunc {
  return handleSingleParamFn('$ceil', expr, context, Math.ceil);
}

/**
 * Takes two numbers and divides the first number by the second.
 *
 * @param expr
 * @param {QueryContext} context
 * @returns {*}
 */
export function $divide(expr: any, context: QueryContext): EvalFunc {
  const exec = parseExpression(context, expr);

  return (obj): number => {
    const args = exec(obj);
    assert(
      Array.isArray(args) && args.length === 2,
      '"$divide" expects an array of 2 arguments',
    );
    const dividend = args[1];
    return args[0] / dividend;
  };
}

/**
 * Raises Euler’s number (i.e. e ) to the specified exponent and returns the result.
 *
 * @param expr
 * @param {QueryContext} context
 * @returns {number}
 */
export function $exp(expr: any, context: QueryContext): EvalFunc {
  return handleSingleParamFn('$exp', expr, context, Math.exp);
}

/**
 * Returns the largest integer less than or equal to the specified number.
 *
 * @param expr
 * @param {QueryContext} context
 * @returns {number}
 */
export function $floor(expr: any, context: QueryContext): EvalFunc {
  return handleSingleParamFn('$floor', expr, context, Math.floor);
}

/**
 * Calculates the natural logarithm ln (i.e loge) of a number and returns the result as a double.
 *
 * @param expr
 * @param {QueryContext} context
 * @returns {number}
 */
export function $ln(expr: any, context: QueryContext): EvalFunc {
  return handleSingleParamFn('$ln', expr, context, Math.log);
}

/**
 * Calculates the log of a number in the specified base and returns the result as a double.
 *
 * @param expr
 * @param {QueryContext} context
 * @returns {number}
 */
export function $log(expr: any, context: QueryContext): EvalFunc {
  const exec = parseExpression(context, expr);
  const msg = '$log expression must resolve to array(2) of numbers';

  return (obj): number => {
    const args = exec(obj);
    assert(Array.isArray(args) && args.length === 2, msg);
    if (args.some(isNil)) return null;
    assert(args.some(isNaN) || args.every(isNumber), msg);
    return Math.log10(args[0]) / Math.log10(args[1]);
  };
}

/**
 * Calculates the log base 10 of a number and returns the result as a double.
 *
 * @param expr
 * @param {QueryContext} context
 * @returns {number}
 */
export function $log10(expr: any, context: QueryContext): EvalFunc {
  return handleSingleParamFn('$log10', expr, context, Math.log10);
}

/**
 * Takes two numbers and calculates the modulo of the first number divided by the second.
 *
 * @param expr
 * @param {QueryContext} context
 * @returns {number}
 */
export function $mod(expr: any, context: QueryContext): EvalFunc {
  const exec = parseExpression(context, expr);
  const msg = '$mod expression must resolve to array(2) of numbers';

  return (obj): number => {
    const values = exec(obj);
    if (values.some(isNil)) return null;
    assert(Array.isArray(values) && values.length === 2, msg);
    assert(values.some(isNaN) || values.every(isNumber), msg);
    return values[0] % values[1];
  };
}

/**
 * Computes the product of an array of numbers.
 *
 * @param expr
 * @param {QueryContext} context
 * @returns {function}
 */
export function $multiply(expr: any, context: QueryContext): EvalFunc {
  const exec = parseExpression(context, expr);

  return (obj): number => {
    const values = exec(obj);
    assert(
      Array.isArray(values) && values.every(isNumber),
      '$multiply arguments must resolve to numbers',
    );
    return values.reduce((acc, num) => acc * num, 1);
  };
}

/**
 * Raises a number to the specified exponent and returns the result.
 *
 * @param expr
 * @param {QueryContext} context
 * @returns {Object}
 */
export function $pow(expr: any, context: QueryContext): EvalFunc {
  const compute = parseExpression(context, expr);

  return (obj): number => {
    const args = compute(obj);
    assert(
      Array.isArray(args) && args.length === 2 && args.every(isNumber),
      '$pow expression must resolve to array(2) of numbers',
    );
    assert(
      !(args[0] === 0 && args[1] < 0),
      '$pow cannot raise 0 to a negative exponent',
    );
    return Math.pow(args[0], args[1]);
  };
}

/**
 * Calculates the square root of a positive number and returns the result as a double.
 *
 * @param expr
 * @param {QueryContext} context
 * @returns {number}
 */
export function $sqrt(expr: any, context: QueryContext): EvalFunc {
  const exec = parseExpression(context, expr);

  function doSqrt(n): number {
    assert(
      (isNumber(n) && n > 0) || isNaN(n),
      '$sqrt expression must resolve to non-negative number.',
    );
    return Math.sqrt(n);
  }

  if (isNumber(expr)) {
    const value = doSqrt(expr);
    return () => value;
  }

  return (obj): number => {
    const n = exec(obj);

    if (isNil(n)) return null;
    assert(
      Array.isArray(n) && n.length === 1,
      '$sqrt expects a single arguments',
    );
    return doSqrt(n);
  };
}

/**
 * Takes an array that contains two numbers or two dates and subtracts the second value
 * from the first.
 *
 * @param expr
 * @param {QueryContext} context
 */
export function $subtract(expr: any, context: QueryContext): EvalFunc {
  const exec = parseExpression(context, expr);

  return (obj): number => {
    const args = exec(obj);
    assert(
      Array.isArray(args) && args.length === 2,
      '$subtract expects an array of 2 arguments',
    );
    return args[0] - args[1];
  };
}

/**
 * Truncates integer value to number of places. If roundOff is specified round value
 * instead to the number of places
 * @param {Number} num
 * @param {Number} places
 * @param {Boolean} roundOff
 */
function truncate(num: number, places: number, roundOff: boolean): number {
  const sign = Math.abs(num) === num ? 1 : -1;
  num = Math.abs(num);

  let result = Math.trunc(num);
  const decimals = num - result;

  if (places === 0) {
    const firstDigit = Math.trunc(10 * decimals);
    if (roundOff && (result & 1) === 1 && firstDigit >= 5) {
      result++;
    }
  } else if (places > 0) {
    const offset = Math.pow(10, places);
    let remainder = Math.trunc(decimals * offset);

    // last digit before cut off
    const lastDigit = Math.trunc(decimals * offset * 10) % 10;

    // add one if last digit is greater than 5
    if (roundOff && lastDigit > 5) {
      remainder += 1;
    }

    // compute decimal remainder and add to whole number
    result += remainder / offset;
  } else if (places < 0) {
    // handle negative decimal places
    const offset = Math.pow(10, -1 * places);
    let excess = result % offset;
    result = Math.max(0, result - excess);

    // for negative values the absolute must increase so we round up the last digit if >= 5
    if (roundOff && sign === -1) {
      while (excess > 10) {
        excess -= excess % 10;
      }
      if (result > 0 && excess >= 5) {
        result += offset;
      }
    }
  }

  return result * sign;
}

/**
 * Rounds a number to to a whole integer or to a specified decimal place.
 * @param {QueryContext} context
 * @param {*} expr
 */
export function $round(expr: any, context: QueryContext): EvalFunc {
  const exec = parseExpression(context, expr);

  return (obj): number => {
    const args = exec(obj);

    assert(
      Array.isArray(args) && args.length === 2,
      '$round expects an array of 2 arguments',
    );

    const [num, place] = args;

    if (isNil(num) || isNaN(NaN) || Math.abs(num) === Infinity) return num;
    assert(isNumber(num), '$round expression must resolve to a number.');
    return truncate(num, place, true);
  };
}

/**
 * Truncates a number to a whole integer or to a specified decimal place.
 *
 * @param expr
 * @param {QueryContext} context
 * @returns {number}
 */
export function $trunc(expr: any, context: QueryContext): EvalFunc {
  const exec = parseExpression(context, expr);

  return (obj): number => {
    const arr = exec(obj);
    assert(
      Array.isArray(arr) && arr.length === 2,
      '$subtract expects an array of 2 arguments',
    );
    const [num, places] = arr;

    if (isNil(num) || isNaN(num) || Math.abs(num) === Infinity) return num;
    assert(isNumber(num), '$trunc expression must resolve to a number.');
    assert(
      isNil(places) || (isNumber(places) && places > -20 && places < 100),
      '$trunc expression has invalid place',
    );
    return truncate(num, places, false);
  };
}
