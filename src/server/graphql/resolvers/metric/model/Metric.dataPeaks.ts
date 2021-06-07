import { FieldConfig } from '../../utils';
import { schemaComposer } from 'graphql-compose';
import { PeakDataPointTC } from '../../stats/types';
import { getQueueManager } from '../../../helpers';
import { BaseMetric } from '@server/metrics';
import boom from '@hapi/boom';
import { MetricDataPeaksInput, PeakDataPoint } from '../../../typings';
import { addMilliseconds, toDate } from 'date-fns';
import { detectPeaks } from '../../stats';

export const MetricDataPeaksInputTC = schemaComposer.createInputTC({
  name: 'MetricDataPeaksInput',
  fields: {
    start: {
      type: 'Date!',
    },
    end: {
      type: 'Date!',
    },
    lag: {
      type: 'Duration',
      description:
        'The lag time (in ms) of the moving window how much your data will be smoothed',
      defaultValue: 0,
    },
    threshold: {
      type: 'Float',
      description:
        'The z-score at which the algorithm signals (i.e. how many standard deviations' +
        ' away from the moving mean a peak (or signal) is)',
      defaultValue: 3.5,
    },
    influence: {
      type: 'Float',
      description:
        'The influence (between 0 and 1) of new signals on the mean and standard ' +
        'deviation (how much a peak (or signal) should affect other values near it)',
      defaultValue: 0.5,
    },
  },
});

// todo: use dataloader for raw data
export const metricDataPeaksFC: FieldConfig = {
  type: PeakDataPointTC.List.NonNull,
  description:
    'Uses a rolling mean and a rolling deviation (separate) to identify peaks in metric data',
  args: {
    input: MetricDataPeaksInputTC.NonNull,
  },
  async resolve(
    parent: BaseMetric,
    { input }: { input: MetricDataPeaksInput },
  ): Promise<PeakDataPoint[]> {
    const { start, end, threshold = 3.5, influence = 0.5, lag = 0 } = input;
    let _start, _end;
    if (start && end) {
      _start = start;
      _end = end;
    } else {
      throw boom.badRequest('Start and end must be specified');
    }
    if (influence < 0 || influence > 1) {
      throw boom.badRequest('Influence should be between 0 and 1');
    }
    let left = toDate(start); // just to make ts happy
    if (lag > 0) {
      left = addMilliseconds(left, lag);
    }
    const manager = getQueueManager(parent.queueId);
    const metrics = manager.metricManager;

    const rawData = await metrics.getMetricData(parent, left, _end);
    return detectPeaks(rawData, lag, threshold, influence);
  },
};
