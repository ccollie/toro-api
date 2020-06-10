import {
  StatsMetricType,
  StatsClient,
  StatsGranularity,
  StatisticalSnapshot,
} from '../../../common/imports';

import {
  getStatsClient,
  normalizeGranularity,
  parseRangeQuery,
} from '../helpers';

interface StatsRangeQueryInput {
  queueId: string;
  jobName?: string;
  granularity?: string;
}

interface StatsQueryInput {
  queueId: string;
  jobName?: string;
  granularity?: string;
  rangeStart?: any;
  rangeEnd?: any;
}

// todo: parse date range
function parseDateRange(range, unit?: StatsGranularity) {
  range = range || {
    start: null,
    end: null,
  };
  return parseRangeQuery(range, unit);
}

async function getSpan(type: StatsMetricType, args, context) {
  const { queueId, jobName, granularity } = args.input as StatsRangeQueryInput;
  const client: StatsClient = getStatsClient(context, queueId);
  const _granularity = normalizeGranularity(granularity);
  return client.getSpan(jobName, type, _granularity);
}

async function getRange(type: StatsMetricType, args, context) {
  const {
    queueId,
    jobName,
    granularity,
    rangeStart,
    rangeEnd,
  } = args.input as StatsQueryInput;
  const client: StatsClient = getStatsClient(context, queueId);
  const _granularity = normalizeGranularity(granularity);
  const dates = parseDateRange(
    {
      start: rangeStart,
      end: rangeEnd,
    },
    _granularity,
  );

  if (type === 'latency') {
    return client.getLatency(jobName, _granularity, dates.start, dates.end);
  } else {
    return client.getWaitTimes(jobName, _granularity, dates.start, dates.end);
  }
}

export const Query = {
  latencyStatsSpan(_, args, context): Promise<any> {
    return getSpan('latency', args, context);
  },
  waitTimeStatsSpan(_, args, context): Promise<any> {
    return getSpan('wait', args, context);
  },
  latencies(_, args, context): Promise<StatisticalSnapshot[]> {
    return getRange('latency', args, context);
  },
  waitTimes(_, args, context): Promise<StatisticalSnapshot[]> {
    return getRange('wait', args, context);
  },
};
