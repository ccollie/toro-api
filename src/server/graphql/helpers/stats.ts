import { StatsClient } from '../../stats';
import { getQueueManager } from './accessors';
import { StatsGranularity, Timespan } from '../../../types';
import { systemClock } from '../../lib';
import { endOf, parseDate, startOf, subtract } from '../../lib/datetime';

export function getStatsClient(id: string): StatsClient {
  const manager = getQueueManager(id);
  return manager && manager.statsClient;
}

export function normalizeGranularity(granularity: string): StatsGranularity {
  return (granularity
    ? granularity.toLowerCase()
    : granularity) as StatsGranularity;
}

export function parseRangeQuery(
  options: any = {},
  unit?: StatsGranularity,
): Timespan {
  let { start, end } = options;
  const now = systemClock.getTime();
  unit = unit || StatsGranularity.Hour;
  if (start && end) {
    return { start, end };
  } else if (!start && !end) {
    end = endOf(now, unit);
    start = startOf(end, unit);
  } else if (start) {
    start = parseDate(start, now);
    end = endOf(start, unit);
  } else {
    end = parseDate(end, now);
    start = subtract(end, 1, unit);
  }
  return { start, end };
}

// todo: parse date range
export function parseDateRange(
  range: Timespan,
  unit?: StatsGranularity,
): Timespan {
  range = range || {
    start: null,
    end: null,
  };
  return parseRangeQuery(range, unit);
}
