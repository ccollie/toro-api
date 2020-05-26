import ms from 'ms';
import { isBefore } from 'date-fns';
import {
  getEndOfPrevious,
  calculateRelativeRange,
  parseDate,
  isValidDate,
  isDateRangeConstant,
  add as dateAdd,
  subtract,
} from '../../../../lib/datetime';
import { systemClock } from '../../../../lib/clock';

const SPECIAL_DATES = ['-', '*', '+'];

function isEpochMs(val) {
  if (typeof val === 'string' && val.match(/^\d+$/g)) {
    const res = new Date(parseInt(val));
    return isValidDate(res);
  }
  return false;
}

function _parseDate(val) {
  if (isEpochMs(val)) {
    return new Date(parseInt(val));
  }
  return SPECIAL_DATES.includes(val) ? val : parseDate(val, systemClock.now());
}

export function parseRangeQuery(options: any = {}) {
  let { start, end, interval, count } = options;
  const { range, unit } = options;
  // start, end
  // last_min, last_hour, last_day, last_week, yesterday, today
  if (range) {
    if (isDateRangeConstant(range)) {
      return calculateRelativeRange(range);
    }
    if (~range.indexOf(',')) {
      // start, end
      const [_start, _end] = range.split(',');

      start = _parseDate(_start);
      end = _parseDate(_end);
    } else {
      // todo: peg beginning to minute ?
      const temp = ms(range);
      end = systemClock.now();
      start = subtract(end, temp, 'ms');
    }
    if (start && end) {
      return { start, end };
    }
  }
  // precision, count
  if (unit && count) {
    count = parseInt(count);
    // relative
    end = getEndOfPrevious(unit);
    start = subtract(end, count, unit);
  } else if (start) {
    start = _parseDate(start);
    if (end) {
      end = _parseDate(end);
    } else if (interval) {
      interval = ms(interval);
      if (start) {
        end = dateAdd(start, interval, 'ms');
      }
    } else if (start && isBefore(start, systemClock.now())) {
      end = new Date(systemClock.now());
    }
  }
  return { start, end };
}
