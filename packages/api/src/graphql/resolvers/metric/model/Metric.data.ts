import { BaseMetric, TimeseriesDataPoint } from '@alpen/core';
import { schemaComposer } from 'graphql-compose';
import { EZContext } from 'graphql-ez';
import { MetricDataInput } from '../../../typings';
import { OutlierFilterInputTC, TimeseriesDataPointTC } from '../../stats/types';
import { FieldConfig } from '../../utils';
import { getMetricData } from './getData';

export const MetricDataInputTC = schemaComposer.createInputTC({
  name: 'MetricDataInput',
  fields: {
    start: {
      type: 'Date!',
    },
    end: {
      type: 'Date!',
    },
    outlierFilter: OutlierFilterInputTC,
  },
});

export const metricDataFC: FieldConfig = {
  type: TimeseriesDataPointTC.List.NonNull,
  args: {
    input: MetricDataInputTC.NonNull,
  },
  async resolve(
    metric: BaseMetric,
    { input }: { input: MetricDataInput },
    context: EZContext,
  ): Promise<TimeseriesDataPoint[]> {
    const { start, end, outlierFilter } = input;
    return getMetricData(context, metric, {
      from: start,
      to: end,
      outlierFilter,
    });
  },
};
