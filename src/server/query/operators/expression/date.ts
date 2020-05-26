import {
  toDate,
  getDayOfYear,
  getDay,
  getYear,
  getMinutes,
  getSeconds,
  getMilliseconds,
  getISOWeek,
  format,
} from 'date-fns';
import { QueryContext } from '../../queryContext';

import { assert, EvalFunc } from '../../utils';
import { parseExpression } from '../../internal';

function handleFn(name, expr, context, fn): EvalFunc {
  const exec = parseExpression(context, expr);

  return (obj, ctx): number => {
    const param = exec(obj, ctx);
    assert(!Array.isArray(param), name + ' expects a single arg');
    const d = toDate(param);
    // todo: validate its a proper date
    return fn(d);
  };
}

/**
 * Returns the day of the year for a date as a number between 1 and 366 (leap year).
 * @param expr
 * @param {QueryContext} context
 */
export function $dayOfYear(expr: any, context: QueryContext): EvalFunc {
  return handleFn('$dayOfYear', expr, context, getDayOfYear);
}

// TODO: test this
/**
 * Returns the day of the month for a date as a number between 1 and 31.
 * @param expr
 * @param {QueryContext} context
 */
export function $dayOfMonth(expr: any, context: QueryContext): EvalFunc {
  return handleFn('$dayOfMonth', expr, context, getDay);
}

/**
 * Returns the day of the week for a date as a number between 1 (Sunday) and 7 (Saturday).
 * @param expr
 * @param {QueryContext} context
 */
export function $dayOfWeek(expr: any, context: QueryContext): EvalFunc {
  return handleFn('$dayOfWeek', expr, context, (d) => d.getDay() + 1);
}

/**
 * Returns the year for a date as a number (e.g. 2014).
 * @param expr
 * @param {QueryContext} context
 */
export function $year(expr: any, context: QueryContext): EvalFunc {
  return handleFn('$year', expr, context, getYear);
}

/**
 * Returns the month for a date as a number between 1 (January) and 12 (December).
 * @param expr
 * @param {QueryContext} context
 */
export function $month(expr: any, context: QueryContext): EvalFunc {
  return handleFn('$month', expr, context, (d) => d.getMonth() + 1);
}

/**
 * Returns the week number for a date as a number between 0
 * (the partial week that precedes the first Sunday of the year) and 53 (leap year).
 * @param expr
 * @param {QueryContext} context
 */
function $week(expr: any, context: QueryContext): EvalFunc {
  return handleFn('$week', expr, context, getISOWeek);
}

/**
 * Returns the hour for a date as a number between 0 and 23.
 * @param {QueryContext} context
 * @param expr
 */
export function $hour(expr: any, context: QueryContext): EvalFunc {
  return handleFn('$hour', expr, context, (d) => d.getUTCHours());
}

/**
 * Returns the minute for a date as a number between 0 and 59.
 * @param expr
 * @param {QueryContext} context
 */
export function $minute(expr: any, context: QueryContext): EvalFunc {
  return handleFn('$minute', expr, context, getMinutes);
}

/**
 * Returns the seconds for a date as a number between 0 and 60 (leap seconds).
 * @param expr
 * @param {QueryContext} context
 */
export function $second(expr: any, context: QueryContext): EvalFunc {
  return handleFn('$second', expr, context, getSeconds);
}

/**
 * Returns the milliseconds of a date as a number between 0 and 999.
 * @param expr
 * @param {Object} context
 */
export function $millisecond(expr: any, context: QueryContext): EvalFunc {
  return handleFn('$millisecond', expr, context, getMilliseconds);
}

// used for formatting dates in $dateToString operator
const DATE_SYM_TABLE = {
  '%Y': 'YYYY',
  '%m': 'MM',
  '%d': 'dd',
  '%H': 'hh',
  '%M': 'mm',
  '%S': 'ss',
  '%L': 'SSS',
  '%j': 'DDD',
  '%w': 'i',
  '%U': 'II',
  '%%': '%',
};

/**
 * Returns the date as a formatted string.
 *
 * %Y  Year (4 digits, zero padded)  0000-9999
 * %m  Month (2 digits, zero padded)  01-12
 * %d  Day of Month (2 digits, zero padded)  01-31
 * %H  Hour (2 digits, zero padded, 24-hour clock)  00-23
 * %M  Minute (2 digits, zero padded)  00-59
 * %S  Second (2 digits, zero padded)  00-60
 * %L  Millisecond (3 digits, zero padded)  000-999
 * %j  Day of year (3 digits, zero padded)  001-366
 * %w  Day of week (1-Sunday, 7-Saturday)  1-7
 * %U  Week of year (2 digits, zero padded)  00-53
 * %%  Percent Character as a Literal  %
 *
 * @param expr operator expression
 * @param {Object} context
 */
export function $dateToString(expr: any, context: QueryContext): EvalFunc {
  const regex = /(%%|%Y|%m|%d|%H|%M|%S|%L|%j|%w|%U)/g;
  const getFmt = parseExpression(context, expr['format']);
  const getDate = parseExpression(context, expr['date']);

  return (obj, context) => {
    let formatString = getFmt(obj, context);
    const d = getDate(obj, context);
    formatString = formatString.replace(regex, (matched) => {
      return DATE_SYM_TABLE[matched] || matched;
    });
    return format(d, formatString);
  };
}
