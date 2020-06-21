import { Queue } from 'bullmq';
import { DateLike, parseTimestamp } from '../lib/datetime';
import { QueueBus } from '../queues';
import { StatisticalSnapshot, StatsGranularity, StatsMetricType } from 'index';
import { systemClock } from '../lib/clock';
import { StatsClientBase } from './statsClientBase';
import { BinnedHistogramValues, computeHistogramBins } from './binning';
import { aggregateData, createHistogram, defaultPercentiles } from './utils';
import RecordedValuesIterator from 'hdr-histogram-js/RecordedValuesIterator';
import { AbstractHistogram } from 'hdr-histogram-js/AbstractHistogram';
import {
  getPercentileDistribution,
  PercentileDistribution,
} from './percentileDistribution';

/**
 * A helper class responsible for managing collected queue stats in redis
 */
export class StatsClient extends StatsClientBase {
  constructor(queue: Queue, bus: QueueBus) {
    super(queue, bus);
  }

  getLatency(
    jobName: string,
    unit: StatsGranularity,
    start: DateLike,
    end: DateLike,
  ): Promise<StatisticalSnapshot[]> {
    const key = this.getKey(jobName, 'latency', unit);
    return this.getRange<StatisticalSnapshot>(key, start, end);
  }

  getWaitTimes(
    jobName: string,
    unit: StatsGranularity,
    start: DateLike,
    end: DateLike,
  ): Promise<StatisticalSnapshot[]> {
    const key = this.getKey(jobName, 'wait', unit);
    return this.getRange<StatisticalSnapshot>(key, start, end);
  }

  private onStatsUpdate(
    type: StatsMetricType,
    jobName: string,
    granularity: StatsGranularity,
    since?: DateLike,
  ): AsyncIterator<StatisticalSnapshot> {
    const now = systemClock.now();
    since = parseTimestamp(since || now, now);

    function filter(_, data: any): boolean {
      let good =
        data &&
        data.value &&
        (!data.jobName || data.jobName === jobName) &&
        (!data.unit || data.unit === granularity);

      if (good) {
        good = data.ts && data.ts > since;
      }
      return good;
    }

    function transform(_, data: any): StatisticalSnapshot {
      return JSON.parse(data.value) as StatisticalSnapshot;
    }

    const eventName = `stats.${type}.updated`;
    return this.bus.createAsyncIterator<any, StatisticalSnapshot>({
      eventNames: [eventName],
      filter,
      transform,
    });
  }

  latencyStatsUpdateIterator(
    jobName: string,
    granularity: StatsGranularity,
  ): AsyncIterator<StatisticalSnapshot> {
    return this.onStatsUpdate('latency', jobName, granularity);
  }

  waitTimeStatsUpdateIterator(
    jobName: string,
    granularity: StatsGranularity,
  ): AsyncIterator<StatisticalSnapshot> {
    return this.onStatsUpdate('wait', jobName, granularity);
  }

  async getRangeAggregate(
    jobName: string,
    metric: StatsMetricType,
    unit: StatsGranularity,
    start?: DateLike,
    end?: DateLike,
  ): Promise<AbstractHistogram> {
    let histogram: AbstractHistogram;
    if (!start && !end) {
      const last = await this.getLast(jobName, metric, unit);
      if (last) {
        histogram = aggregateData([last]);
      } else {
        histogram = createHistogram();
      }
    } else {
      start = parseTimestamp(start);
      end = parseTimestamp(end);
      const key = this.getKey(jobName, metric, unit);
      const range = await this.getRange<StatisticalSnapshot>(key, start, end);
      histogram = aggregateData(range);
    }
    return histogram;
  }

  async getHistogramBins(
    jobName: string,
    metric: StatsMetricType,
    unit: StatsGranularity,
    start?: DateLike,
    end?: DateLike,
  ): Promise<BinnedHistogramValues> {
    const histogram = await this.getRangeAggregate(
      jobName,
      metric,
      unit,
      start,
      end,
    );
    const iterator = new RecordedValuesIterator(histogram);

    return computeHistogramBins({ iterator });
  }

  async getPercentileDistribution(
    jobName: string,
    metric: StatsMetricType,
    unit: StatsGranularity,
    start?: DateLike,
    end?: DateLike,
    percentiles?: number[],
  ): Promise<PercentileDistribution> {
    percentiles = percentiles || defaultPercentiles;
    const histogram = await this.getRangeAggregate(
      jobName,
      metric,
      unit,
      start,
      end,
    );
    return getPercentileDistribution(histogram, percentiles);
  }
}
