import { FieldConfig } from '../../utils';
import { schemaComposer } from 'graphql-compose';
import {
  OutlierDetectionMethod,
  TimeseriesDataPointTC,
} from '../../stats/types';
import { BaseMetric } from '@server/metrics';
import { MetricDataOutliersInput } from '../../../typings';
import { OutlierMethod } from '@server/stats/outliers';
import { TimeseriesDataPoint } from '@src/types';
import { getData } from '@server/graphql/resolvers/metric/model/getData';

export const MetricDataOutliersInputTC = schemaComposer.createInputTC({
  name: 'MetricDataOutliersInput',
  fields: {
    start: {
      type: 'Date!',
    },
    end: {
      type: 'Date!',
    },
    method: {
      type: OutlierDetectionMethod.NonNull,
      defaultValue: OutlierMethod.Sigma,
    },
    threshold: {
      type: 'Float',
      description:
        'the threshold for outline detection. Defaults depend on the method of detection',
    },
  },
});

export const metricDataOutliersFC: FieldConfig = {
  type: TimeseriesDataPointTC.List.NonNull,
  description:
    'Uses a rolling mean and a rolling deviation (separate) to identify peaks in metric data',
  args: {
    input: MetricDataOutliersInputTC.NonNull,
  },
  async resolve(
    metric: BaseMetric,
    { input }: { input: MetricDataOutliersInput },
    { loaders },
  ): Promise<TimeseriesDataPoint[]> {
    const { start, end, threshold, method } = input;

    const filterOpts = method
      ? {
          method,
          threshold,
        }
      : null;

    return getData(loaders, metric, start, end, filterOpts);
  },
};
