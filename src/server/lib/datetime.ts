import boom from '@hapi/boom';
import { isDate, isNil } from 'lodash';
import { isNumber } from './utils';
import ms from 'ms';

import {
  closestTo,
  toDate,
  parse,
  parseISO,
  addMilliseconds,
  addSeconds,
  addMinutes,
  addHours,
  addDays,
  addWeeks,
  addMonths,
  addQuarters,
  addYears,
  subMilliseconds,
  subSeconds,
  subMinutes,
  subHours,
  subDays,
  subWeeks,
  subMonths,
  subQuarters,
  subYears,
  startOfSecond,
  startOfMinute,
  startOfHour,
  startOfDay,
  startOfMonth,
  startOfQuarter,
  startOfWeek,
  startOfYear,
  endOfSecond,
  endOfMinute,
  endOfHour,
  endOfDay,
  endOfMonth,
  endOfQuarter,
  endOfWeek,
  endOfYear,
} from 'date-fns';
import { Timespan } from '../../types';

export type DateLike = Date | number;

// https://github.com/date-fns/date-fns/blob/master/docs/unicodeTokens.md
const DATE_FORMATS = [
  "yyyy-MM-dd'T'HH:mm:ss",
  "yyyy-MM-dd'T'HH:mm:ss.SSS",
  "yyyy-MM-dd'T'HH:mm",
  'yyyy-MM-dd',
];

export function isValidDate(obj: unknown): boolean {
  return obj instanceof Date && !isNaN(obj.getTime());
}

export function normalizeUnit(str: string = null): string {
  const type = (str || 'ms').toLowerCase();
  switch (type) {
    case 'years':
    case 'year':
    case 'yrs':
    case 'yr':
    case 'y':
      return 'year';
    case 'quarters':
    case 'quarter':
    case 'q':
      return 'quarter';
    case 'weeks':
    case 'week':
    case 'w':
      return 'week';
    case 'days':
    case 'day':
    case 'd':
      return 'day';
    case 'hours':
    case 'hour':
    case 'hrs':
    case 'hr':
    case 'h':
      return 'hour';
    case 'minutes':
    case 'minute':
    case 'mins':
    case 'min':
    case 'm':
      return 'minute';
    case 'seconds':
    case 'second':
    case 'secs':
    case 'sec':
    case 's':
      return 'second';
    case 'milliseconds':
    case 'millisecond':
    case 'msecs':
    case 'msec':
    case 'ms':
      return 'millisecond';
    default:
      return undefined;
  }
}

export function add(date: DateLike, amount: number, unit: string): Date {
  unit = normalizeUnit(unit);
  switch (unit) {
    case 'year':
      return addYears(date, amount);
    case 'quarter':
      return addQuarters(date, amount);
    case 'month':
      return addMonths(date, amount);
    case 'week':
      return addWeeks(date, amount);
    case 'day':
      return addDays(date, amount);
    case 'hour':
      return addHours(date, amount);
    case 'minute':
      return addMinutes(date, amount);
    case 'second':
      return addSeconds(date, amount);
    case 'millisecond':
      return addMilliseconds(date, amount);
  }
  return toDate(date);
}

export function subtract(date: DateLike, amount: number, unit: string): Date {
  unit = normalizeUnit(unit);
  switch (unit) {
    case 'year':
      return subYears(date, amount);
    case 'quarter':
      return subQuarters(date, amount);
    case 'month':
      return subMonths(date, amount);
    case 'week':
      return subWeeks(date, amount);
    case 'day':
      return subDays(date, amount);
    case 'hour':
      return subHours(date, amount);
    case 'minute':
      return subMinutes(date, amount);
    case 'second':
      return subSeconds(date, amount);
    case 'millisecond':
      return subMilliseconds(date, amount);
  }
  return toDate(date);
}

export function startOf(date: DateLike, unit: string): Date {
  unit = normalizeUnit(unit);
  switch (unit) {
    case 'year':
      return startOfYear(date);
    case 'quarter':
      return startOfQuarter(date);
    case 'month':
      return startOfMonth(date);
    case 'week':
      return startOfWeek(date);
    case 'day':
      return startOfDay(date);
    case 'hour':
      return startOfHour(date);
    case 'minute':
      return startOfMinute(date);
    case 'second':
      return startOfSecond(date);
  }
  return toDate(date);
}

export function endOf(date: DateLike, unit: string): Date {
  unit = normalizeUnit(unit);
  switch (unit) {
    case 'year':
      return endOfYear(date);
    case 'quarter':
      return endOfQuarter(date);
    case 'month':
      return endOfMonth(date);
    case 'week':
      return endOfWeek(date);
    case 'day':
      return endOfDay(date);
    case 'hour':
      return endOfHour(date);
    case 'minute':
      return endOfMinute(date);
    case 'second':
      return endOfSecond(date);
  }
  return toDate(date);
}

export function parseDate(date, defaultVal: DateLike): Date {
  if (isNumber(date)) {
    date = parseInt(date);
    return toDate(date);
  }
  let result = parseISO(date);
  if (isValidDate(result)) {
    return result;
  }
  for (let i = 0; i < DATE_FORMATS.length; i++) {
    result = parse(date, DATE_FORMATS[i], null);
    if (isValidDate(result)) return result;
  }
  return toDate(defaultVal);
}

export function parseTimestamp(date, defaultVal: number = undefined): number {
  if (isNil(date)) {
    return defaultVal;
  }
  if (isNumber(date)) {
    return parseInt(date);
  }
  if (isDate(date)) {
    return date.getTime();
  }
  let result = parseISO(date);
  if (isValidDate(result)) {
    return result.getTime();
  }
  for (let i = 0; i < DATE_FORMATS.length; i++) {
    result = parse(date, DATE_FORMATS[i], null);
    if (isValidDate(result)) {
      return result.getTime();
    }
  }
  return defaultVal;
}

export function parseDuration(
  value: any,
  defaultValue: number = undefined,
): number {
  if (value === undefined) {
    if (defaultValue !== undefined) {
      return parseDuration(defaultValue);
    }
    return undefined; // ?? NaN
  }
  if (isNumber(value)) {
    return parseInt(value);
  }

  value = ms(value);

  if (value === undefined) {
    if (arguments.length > 1) {
      return defaultValue ? parseDuration(defaultValue) : undefined; // NaN ?
    }
    throw boom.badRequest(`Invalid duration value ${value}`);
  }

  return value;
}

// redis stream '*' returns epoch milliseconds
export function fromStreamId(id: string): Date {
  const [timestamp] = id.split('-');
  return new Date(parseInt(timestamp));
}

// Round timestamp to the 'precision' interval
export function roundDate(
  time: DateLike,
  precision: number,
  direction = 'down',
): number {
  time = toDate(time);
  if (direction === 'down') {
    return Math.floor(time.getTime() / precision) * precision;
  } else {
    return Math.ceil(time.getTime() / precision) * precision;
  }
}

export function roundUp(date: DateLike, precision: number): number {
  return roundDate(addMilliseconds(date, precision), precision, 'up');
}

export function roundDown(date: DateLike, precision: number): number {
  return roundDate(subMilliseconds(date, precision), precision, 'down');
}

export function roundToNearest(date: DateLike, precision: number): Date {
  date = toDate(date);
  const ts = date.getTime();
  const up = roundUp(date, precision);
  if (ts === up) return date;
  const down = roundDown(date, precision);
  if (ts === down) return date;
  return closestTo(date, [up, down]);
}

// Round interval to a "nice" value
export function roundInterval(interval: number): number {
  let precision = interval;
  const asString = ms(interval, { long: true });
  const [count, unit] = asString.split(' ')[1];

  let divisors;
  const amount = Number(count);

  switch (normalizeUnit(unit)) {
    case 'millisecond':
      divisors = [5];
      break;
    case 'second':
    case 'minute':
      divisors = [5, 10, 15, 20, 30];
      break;
    case 'hour':
      divisors = [1, 2, 3, 4, 6];
      break;
    case 'day':
      divisors = [1, 7];
      break;
  }

  if (divisors) {
    let found = false;
    for (let i = divisors.length - 1; i >= 0; i--) {
      if (amount >= divisors[i]) {
        precision = divisors[i];
        found = true;
        break;
      }
    }
    if (!found) precision = divisors[0];
  } else {
    return interval;
  }

  return Math.floor(interval / precision) * precision;
}

const NumericalRangeRegex = /(\d+)\s*-\s*(\d+)/;
const DurationRegex = /(\d*)([a-zA-Z]+)/;

export function parseRange(expr: string, reference?: Date | number): Timespan {
  reference = reference || Date.now();

  function raiseError(): void {
    throw boom.badRequest(`Invalid token "${expr}"`);
  }

  function assert(test: boolean): void {
    if (!test) raiseError();
  }

  function getRange(unit: string): Timespan {
    return {
      start: startOf(reference, unit).getTime(),
      end: endOf(reference, unit).getTime(),
    };
  }

  function getPrevRange(unit: string): Timespan {
    const end = addMilliseconds(startOf(reference, unit), -1).getTime();
    const start = startOf(end, unit).getTime();
    return {
      start,
      end,
    };
  }

  const m = expr.match(NumericalRangeRegex);
  if (m?.length) {
    return {
      start: parseInt(m[1]),
      end: parseInt(m[2]),
    };
  }
  if (expr === 'today') {
    return getRange('day');
  } else if (expr === 'yesterday') {
    return getPrevRange('day');
  } else {
    const parts = expr.split('_');
    assert(parts.length === 2);
    const [relativePart, durationSpec] = parts;
    assert(['this', 'last'].includes(relativePart));

    if (relativePart === 'this') {
      // handle cases like "this_week"
      if (!isNumber(durationSpec[0])) {
        const unit = normalizeUnit(durationSpec);
        return getRange(unit);
      }
      raiseError();
    } else {
      // handle cases like "last_week"
      if (!isNumber(durationSpec[0])) {
        const unit = normalizeUnit(durationSpec);
        return getPrevRange(unit);
      }
      // handle cases like last_6hrs
      const m = durationSpec.match(DurationRegex);
      assert(m.length > 1);

      const count = parseInt(m[1]);
      const unit = normalizeUnit(m[2]);
      if (!unit) {
        throw boom.badRequest(`Invalid unit "${m[2]}" in range "${expr}"`);
      }
      // TODO: should this be the end of the previous period ??
      const end = endOf(reference, unit);
      const start = add(end, -1 * count, unit);

      return {
        start: start.getTime(),
        end: end.getTime(),
      };
    }
  }
}
