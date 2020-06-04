import { Queue } from 'bullmq';
import {
  StatisticalSnapshot,
  StatsGranularity,
  StatsQueryOptions,
} from '../../../common/imports';
import { endOf, startOf } from '../../../../lib/datetime';

function getPrevUnit(granularity: StatsGranularity): string {
  switch (granularity) {
    case StatsGranularity.Minute:
      return StatsGranularity.Hour;
    case StatsGranularity.Hour:
      return StatsGranularity.Day;
    case StatsGranularity.Day:
      return StatsGranularity.Week;
    case StatsGranularity.Week:
      return StatsGranularity.Month;
  }
  return 'year';
}

function getRange(start, end, granularity: StatsGranularity) {
  const now = new Date();
  const prevUnit = getPrevUnit(granularity);
  if (!start) {
    start = startOf(now, prevUnit);
  }
  if (!end) {
    end = endOf(now, prevUnit);
  }
  return { start, end };
}

export function getStats(
  type: 'latency' | 'wait',
  queue: Queue,
  args,
  { supervisor },
): Promise<StatisticalSnapshot[]> {
  const manager = supervisor.getQueueManager(queue);
  const statsClient = manager.statsClient;
  const defaults: StatsQueryOptions = {
    jobName: null,
    metric: type,
    granularity: StatsGranularity.Minute,
  };
  let options: StatsQueryOptions;
  if (!args) {
    options = defaults;
  } else {
    options = { ...args };
  }
  if (!options.granularity) {
    options.granularity = StatsGranularity.Minute;
  }
  const { start, end } = getRange(
    options.start,
    options.end,
    options.granularity,
  );
  options.start = start;
  options.end = end;

  if (type === 'latency') {
    return statsClient.getLatency(
      options.jobName,
      options.granularity,
      options.start,
      options.end,
    );
  }
  return statsClient.wait(
    options.jobName,
    options.granularity,
    options.start,
    options.end,
  );
}
