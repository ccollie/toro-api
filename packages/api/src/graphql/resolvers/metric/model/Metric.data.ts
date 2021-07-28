import { FieldConfig } from '../../utils';
import { schemaComposer } from 'graphql-compose';
import { OutlierFilterInputTC, TimeseriesDataPointTC } from '../../stats/types';
import { BaseMetric } from '@alpen/core';
import { TimeseriesDataPoint } from '@alpen/core';
import { MetricDataInput } from '../../../typings';
import { getData } from './getData';

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
    { loaders },
  ): Promise<TimeseriesDataPoint[]> {
    const { start, end, outlierFilter } = input;
    return getData(loaders, metric, start, end, outlierFilter);
  },
};
