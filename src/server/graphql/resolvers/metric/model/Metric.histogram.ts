import { FieldConfig } from '../../utils';
import { BaseMetric } from '@server/metrics';
import { getMetricData } from '@server/graphql/loaders/metric-data';
import {
  BaseHistogramInputFields,
  HistogramPayloadTC,
  parseHistogramBinningOptions,
} from '@server/graphql/resolvers/stats';
import {
  BinnedHistogramValues,
  computeBins,
} from '@server/stats/histogram-bins';
import { MetricsHistogramInput } from '@server/graphql/typings';
import { schemaComposer } from 'graphql-compose';
import { toDate } from 'date-fns';

const MetricHistogramInputTC = schemaComposer.createInputTC({
  name: 'MetricsHistogramInput',
  description: 'Compute a frequency distribution of a range of metric data.',
  fields: {
    ...BaseHistogramInputFields,
  },
});

export const metricHistogramFC: FieldConfig = {
  type: HistogramPayloadTC.NonNull,
  args: {
    input: MetricHistogramInputTC.NonNull,
  },
  async resolve(
    metric: BaseMetric,
    { input }: { input: MetricsHistogramInput },
    { loaders },
  ): Promise<BinnedHistogramValues> {
    const { from, to, options } = input;
    const startTime = toDate(from);
    const endTime = toDate(to);

    const data = await getMetricData(loaders, metric, startTime, endTime);

    const opts = parseHistogramBinningOptions(options);

    return computeBins(
      data,
      (x) => x.value,
      (x) => 1,
      opts,
    );
  },
};
