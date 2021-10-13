import { FieldConfig } from '../../utils';
import {
  BaseHistogramInputFields,
  HistogramPayloadTC,
  parseHistogramBinningOptions,
} from '../../stats';
import { BaseMetric } from '@alpen/core/metrics';
import { BinnedHistogramValues, computeBins } from '@alpen/core/stats';
import { MetricsHistogramInput } from '../../../typings';
import { schemaComposer } from 'graphql-compose';
import { OutlierFilterInputTC } from '../../stats/types';
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
