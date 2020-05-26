import {
  inArray,
  assert,
  isEmpty,
  compare,
  EvalFunc,
  CompareResult,
} from '../../utils';
import { parseExpression } from '../../internal';
import { isEqual, isNil, isString, isNumber } from 'lodash';
import { QueryContext } from '../../queryContext';

const UTF8_MASK = [0xc0, 0xe0, 0xf0];
// encodes a unicode code point to a utf8 byte sequence
// https://encoding.spec.whatwg.org/#utf-8
function toUtf8(n): number[] {
  if (n < 0x80) return [n];
  let count = (n < 0x0800 && 1) || (n < 0x10000 && 2) || 3;
  const offset = UTF8_MASK[count - 1];
  const utf8 = [(n >> (6 * count)) + offset];
  while (count > 0) utf8.push(0x80 | ((n >> (6 * --count)) & 0x3f));
  return utf8;
}

function utf8Encode(s): any[] {
  const buf = [];
  for (let i = 0, len = s.length; i < len; i++) {
    buf.push(toUtf8(s.codePointAt(i)));
  }
  return buf;
}

/**
 * Concatenates two strings.
 *
 * @param expr
 * @param {QueryContext} context
 */
export function $concat(expr: any, context: QueryContext): EvalFunc {
  const exec = parseExpression(context, expr);

  return (obj): string => {
    const args = exec(obj);
    // does not allow concatenation with nulls
    if ([null, undefined].some(inArray.bind(null, args))) return null;
    return args.join('');
  };
}

/**
 * Searches a string for an occurrence of a substring and returns the UTF-8
 * code point index of the first occurence. If the substring is not found, returns -1.
 *
 * @param  {*} expr
 * @param {QueryContext} context
 * @return {*}
 */
export function $indexOfBytes(expr: any, context: QueryContext): EvalFunc {
  const exec = parseExpression(context, expr);
  const errorMsg = '$indexOfBytes expression resolves to invalid an argument';

  return (obj): number => {
    const arr = exec(obj);
    if (isNil(arr[0])) return null;

    assert(isString(arr[0]) && isString(arr[1]), errorMsg);

    const str = arr[0];
    const searchStr = arr[1];
    let start = arr[2];
    let end = arr[3];

    let valid =
      isNil(start) ||
      (isNumber(start) && start >= 0 && Math.round(start) === start);
    valid =
      valid &&
      (isNil(end) || (isNumber(end) && end >= 0 && Math.round(end) === end));
    assert(valid, errorMsg);

    start = start || 0;
    end = end || str.length;

    if (start > end) return -1;

    const index = str.substring(start, end).indexOf(searchStr);
    return index > -1 ? index + start : index;
  };
}

/**
 * Splits a string into substrings based on a delimiter.
 * If the delimiter is not found within the string, returns an array containing the original string.
 *
 * @param  {*} expr
 * @param {QueryContext} context
 */
export function $split(expr: any, context: QueryContext): EvalFunc {
  const exec = parseExpression(context, expr);

  /**
   * @return {Array} Returns an array of substrings.
   */
  return (obj): string[] => {
    const args = exec(obj);
    if (isNil(args[0])) return null;
    assert(
      args.length === 2 && args.every(isString),
      '$split expression must result to array(2) of strings',
    );
    return args[0].split(args[1]);
  };
}

/**
 * Returns the number of UTF-8 encoded bytes in the specified string.
 *
 * @param {String} expr
 * @param {QueryContext} context
 */
export function $strLenBytes(expr: any, context: QueryContext): EvalFunc {
  const exec = parseExpression(context, expr);

  return (obj, context): number => {
    const str = exec(obj, context);
    return ~-encodeURI(str).split(/%..|./).length;
  };
}

/**
 * Returns the number of UTF-8 code points in the specified string.
 *
 * @param  {String} expr
 * @param context
 */
export function $strLenCP(expr: any, context: QueryContext): EvalFunc {
  const exec = parseExpression(context, expr);

  return (obj, context): number => {
    const str = exec(obj, context);
    return (str || '').toString().length;
  };
}

/**
 * Compares two strings and returns an integer that reflects the comparison.
 *
 * @param expr
 * @param {QueryContext} context
 * @returns {number}
 */
export function $strcasecmp(expr: any, context: QueryContext): EvalFunc {
  const exec = parseExpression(context, expr);

  return (obj, context): CompareResult => {
    const args = exec(obj, context);

    const a = args[0];
    const b = args[1];
    if (isEqual(a, b) || args.every(isNil)) return 0;
    assert(
      args.every(isString),
      '$strcasecmp must resolve to array(2) of strings',
    );
    return compare(a.toUpperCase(), b.toUpperCase());
  };
}

/**
 * Returns a substring of a string, starting at a specified index position and
 * including the specified number of characters. The index is zero-based.
 *
 * @param expr
 * @param {QueryContext} context
 */
export function $substrBytes(expr: any, context: QueryContext): EvalFunc {
  const exec = parseExpression(context, expr);

  return (obj, context): string => {
    const args = exec(obj, context);
    const [s, index, count] = args;

    assert(
      isString(s) &&
        isNumber(index) &&
        index >= 0 &&
        isNumber(count) &&
        count >= 0,
      '$substrBytes: invalid arguments',
    );
    const buf = utf8Encode(s);
    const validIndex = [];
    let acc = 0;
    for (let i = 0; i < buf.length; i++) {
      validIndex.push(acc);
      acc += buf[i].length;
    }
    const begin = validIndex.indexOf(index);
    const end = validIndex.indexOf(index + count);
    assert(
      begin > -1 && end > -1,
      '$substrBytes: invalid range, start or end index is a UTF-8 continuation byte.',
    );
    return s.substring(begin, end);
  };
}

/**
 * Returns a substring of a string, starting at a specified index position and including the
 * specified number of characters.
 * The index is zero-based.
 *
 * @param expr
 * @param {QueryContext} context
 */
export function $substr(expr: any, context: QueryContext): EvalFunc {
  const exec = parseExpression(context, expr);
  assert(
    Array.isArray(expr) && expr.length === 3,
    'expected $substr: [ <string>, <start>, <length> ]',
  );

  return (obj, context): string => {
    const args = exec(obj, context);
    const [s, index, count] = args;

    if (isString(s)) {
      if (index < 0) {
        return '';
      } else if (count < 0) {
        return s.substr(index);
      } else {
        return s.substr(index, count);
      }
    }
    return '';
  };
}

/**
 * Converts a string to lowercase.
 *
 * @param expr
 * @param {QueryContext} context
 */
export function $toLower(expr: any, context: QueryContext): EvalFunc {
  const exec = parseExpression(context, expr);

  return (obj, context): string => {
    const value = exec(obj, context);
    return isEmpty(value) ? '' : value.toLowerCase();
  };
}

/**
 * Converts a string to uppercase.
 *
 * @param expr
 * @param {QueryContext} context
 */
export function $toUpper(expr: any, context: QueryContext): EvalFunc {
  const exec = parseExpression(context, expr);

  return (obj, context): string => {
    const value = exec(obj, context);
    return isEmpty(value) ? '' : value.toUpperCase();
  };
}
