import { FieldConfig } from '../../utils';
import { BaseMetric } from '@server/metrics';
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
import { OutlierFilterInputTC } from '@server/graphql/resolvers/stats/types';
import { getData } from './getData';

const MetricHistogramInputTC = schemaComposer.createInputTC({
  name: 'MetricsHistogramInput',
  description: 'Compute a frequency distribution of a range of metric data.',
  fields: {
    ...BaseHistogramInputFields,
    outlierFilter: OutlierFilterInputTC,
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
    const { from, to, options, outlierFilter } = input;

    const data = await getData(loaders, metric, from, to, outlierFilter);

    const opts = parseHistogramBinningOptions(options);

    return computeBins(
      data,
      (x) => x.value,
      (x) => 1,
      opts,
    );
  },
};
