import {
  format,
  formatDistance,
  formatDistanceStrict,
  isSameYear,
  isToday,
  parseJSON,
  toDate,
} from 'date-fns';
import day from 'dayjs';
import ms from 'ms';
import prettyMilliseconds from 'pretty-ms';
import closestTo from 'date-fns/closestTo';
import startOfMonth from 'date-fns/startOfMonth';
import startOfWeek from 'date-fns/startOfWeek';
import startOfDay from 'date-fns/startOfDay';
import startOfHour from 'date-fns/startOfHour';
import startOfMinute from 'date-fns/startOfMinute';
import startOfSecond from 'date-fns/startOfSecond';
import endOfMonth from 'date-fns/endOfMonth';
import endOfWeek from 'date-fns/endOfWeek';
import endOfDay from 'date-fns/endOfDay';
import endOfHour from 'date-fns/endOfHour';
import endOfMinute from 'date-fns/endOfMinute';
import endOfSecond from 'date-fns/endOfSecond';
import { Maybe } from 'src/types';

const ONE_SECOND = 1000;
export const ONE_MINUTE = ONE_SECOND * 60;
export const ONE_HOUR = ONE_MINUTE * 60;
export const ONE_DAY = ONE_HOUR * 24;
export const ONE_WEEK = ONE_DAY * 7;
export const ONE_MONTH = ONE_WEEK * 4;

export interface Timespan {
  start: Date;
  end: Date;
}

const config = {
  units: ['minutes', 'hours', 'days', 'weeks', 'months'],
  granularity: ['second', 'minute', 'hour', 'hour', 'day'],
  tickCount: [60, 60, 24, 7 * 24, 30],
  interval: [ONE_MINUTE, ONE_HOUR, ONE_DAY, ONE_WEEK, ONE_MONTH],
};

function getUnitIndex(unit: string): number {
  for (let i = 0; i < config.units.length; i++) {
    if (config.units[i] === unit || unit.startsWith(config.units[i])) {
      return i;
    }
  }
  return -1;
}

export function getUnit(interval: number): string {
  // round to 5 secs to handle right open range
  const rounded = interval + 5 - (interval % 5);
  const asString = ms(rounded, { long: true });
  const [, unit] = asString.split(' ');
  return unit;
}

export type DateLike = Date | number;

export function parseDate(ts: unknown): Date {
  const type = typeof ts;
  if (type === 'number' || type === 'string') {
    return parseJSON(ts as string);
  } else if (type === 'undefined') {
    return new Date();
  } else {
    return toDate(ts as any);
  }
}

export function formatDate(ts: unknown): string {
  if (ts === undefined || ts === null) {
    return '';
  }
  const date = parseDate(ts);
  if (isToday(date)) {
    return format(date, 'HH:mm:ss');
  }
  const today = new Date();
  return isSameYear(date, today)
    ? format(date, 'MMM dd HH:mm:ss')
    : format(date, 'MMM dd, yyyy HH:mm:ss');
}

export function formatDuration(duration: number | null): string {
  return duration ? prettyMilliseconds(duration) : '';
}

export function relativeFormat(
  value: DateLike,
  from?: DateLike,
  verbose = false,
): string {
  const now = toDate(from || new Date());
  const val = new Date(value);
  const suffix = val < now ? 'ago' : 'from now';

  const formattedValue = verbose
    ? formatDistance(val, now)
    : formatDistanceStrict(val, now);
  return `${formattedValue} ${suffix}`;
}

export function parseDuration(val: string | number): number {
  if (typeof val === 'number') {
    return val;
  }
  const parsed = parseInt(val, 10);
  if (!isNaN(parsed)) return parsed;
  try {
    return ms(val);
  } catch {
    return NaN;
  }
}

function normalizeUnit(str: string): string {
  const type = (str || 'seconds').toLowerCase();
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
    case 'months':
    case 'month':
    case 'mnth':
      return 'month';
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
      return str;
  }
}

export function getParentUnit(unit: string): string {
  if (!unit) return 'minutes';
  switch (unit) {
    case 'seconds':
    case 'second':
      return 'minute';
    case 'minutes':
    case 'minute':
      return 'hours';
    case 'hours':
    case 'hour':
      return 'days';
    case 'days':
    case 'day':
      return 'weeks';
    case 'weeks':
    case 'week':
      return 'months';
    default:
      return 'years';
  }
}

export function startOf(date: DateLike, unit: string): Date {
  unit = normalizeUnit(unit);
  switch (unit) {
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

export function calculateTicks(interval: number): number {
  const unit = getUnit(interval);
  const currentIndex = getUnitIndex(unit);
  if (currentIndex > 0) {
    return config.tickCount[currentIndex];
  }
  // find next higher unit
  const nextIndex = getUnitIndex(unit);
  if (nextIndex >= 0) {
    const nextInterval = config.interval[nextIndex];
    const currInterval = config.interval[currentIndex];
    return Math.floor(nextInterval / currInterval);
  }
  return 60;
}

export function roundUp(ts: DateLike, interval: number): Date {
  const base = typeof ts === 'number' ? ts : ts.getTime();
  const next = base + interval - (base % interval);
  return new Date(next);
}

export function roundDown(ts: DateLike, interval: number): Date {
  const base = typeof ts === 'number' ? ts : ts.getTime();
  const next = base - (base % interval);
  return new Date(next);
}

export function roundToNearest(date: DateLike, precision: number): Date {
  const up = roundUp(date, precision);
  const down = roundDown(date, precision);
  return closestTo(date, [up, down])!;
}

export function convertUTCDateToLocalDate(date: DateLike): Date {
  date = toDate(date);
  const newDate = new Date(
    date.getTime() + date.getTimezoneOffset() * 60 * 1000,
  );

  const offset = date.getTimezoneOffset() / 60;
  const hours = date.getHours();

  newDate.setHours(hours - offset);

  return newDate;
}

export const formatDateTime = (
  date?: Maybe<day.ConfigType>,
  format = 'YYYY-MM-DD HH:mm:ss'
): Maybe<string> => {
  if (!date) {
    return null;
  }
  return day(date).format(format);
};
