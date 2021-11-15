import { BaseMetric, OutlierMethod, TimeseriesDataPoint } from '@alpen/core';
import { schemaComposer } from 'graphql-compose';
import { MetricDataOutliersInput } from '../../../typings';
import { OutlierDetectionMethod, TimeseriesDataPointTC, } from '../../stats/types';
import { FieldConfig } from '../../utils';
import { getMetricData } from './getData';

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

    const outlierFilter = method
      ? {
          method,
          threshold,
        }
      : null;

    return getMetricData(loaders, metric, {
      from: start,
      to: end,
      outlierFilter,
    });
  },
};
