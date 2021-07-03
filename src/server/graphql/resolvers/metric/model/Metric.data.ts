import { FieldConfig } from '../../utils';
import { schemaComposer } from 'graphql-compose';
import { OutlierFilterInputTC, TimeseriesDataPointTC } from '../../stats/types';
import { BaseMetric } from '@server/metrics';
import { TimeseriesDataPoint } from '@src/types';
import { MetricDataInput } from '../../../typings';
import { getData } from '@server/graphql/resolvers/metric/model/getData';

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
