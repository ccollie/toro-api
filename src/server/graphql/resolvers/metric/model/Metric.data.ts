import boom from '@hapi/boom';
import { FieldConfig } from '../../utils';
import { schemaComposer } from 'graphql-compose';
import { TimeseriesDataPointTC } from '../../stats/types';
import { BaseMetric } from '@server/metrics';
import { TimeseriesDataPoint } from '@src/types';
import { MetricDataInput } from '../../../typings';
import { getMetricData } from '@server/graphql/loaders/metric-data';

export const MetricDataInputTC = schemaComposer.createInputTC({
  name: 'MetricDataInput',
  fields: {
    start: {
      type: 'Date!',
    },
    end: {
      type: 'Date!',
    },
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
    const { start, end } = input;
    let _start, _end;
    if (start && end) {
      _start = start;
      _end = end;
    } else {
      throw boom.badRequest('Either start/end or range must be specified');
    }
    return getMetricData(loaders, metric, _start, _end);
  },
};
