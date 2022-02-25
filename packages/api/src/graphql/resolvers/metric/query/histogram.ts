import { BaseMetric, BinnedHistogramValues, computeBins } from '@alpen/core';
import { schemaComposer } from 'graphql-compose';
import { MetricsHistogramInput } from '../../../typings';
import { BaseHistogramInputFields, HistogramPayloadTC, parseHistogramBinningOptions, } from '../../stats';
import { OutlierFilterInputTC } from '../../stats/types';
import { FieldConfig } from '../../utils';
import { getMetricData } from './getData';

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

    const data = await getMetricData(loaders, metric, {
      from,
      to,
      outlierFilter,
    });

    const opts = parseHistogramBinningOptions(options);

    return computeBins(
      data,
      (x) => x.value,
      (x) => 1,
      opts,
    );
  },
};
