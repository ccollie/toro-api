import { FieldConfig } from '../../utils';
import { schemaComposer } from 'graphql-compose';
import { PeakDataPointTC } from '../../stats/types';
import { BaseMetric } from '@server/metrics';
import boom from '@hapi/boom';
import { MetricDataOutliersInput, PeakDataPoint } from '../../../typings';
import { addMilliseconds, toDate } from 'date-fns';
import { detectPeaks } from '../../stats';
import { getMetricData } from '@server/graphql/loaders/metric-data';

export const MetricDataOutliersInputTC = schemaComposer.createInputTC({
  name: 'MetricDataOutliersInput',
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

export const metricDataOutliersFC: FieldConfig = {
  type: PeakDataPointTC.List.NonNull,
  description:
    'Uses a rolling mean and a rolling deviation (separate) to identify peaks in metric data',
  args: {
    input: MetricDataOutliersInputTC.NonNull,
  },
  async resolve(
    metric: BaseMetric,
    { input }: { input: MetricDataOutliersInput },
    { loaders },
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
      left = addMilliseconds(left, -lag);
    }

    const rawData = await getMetricData(loaders, metric, left, _end);
    return detectPeaks(rawData, lag, threshold, influence);
  },
};
