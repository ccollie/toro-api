import { FieldConfig } from '../';
import {
  computeHistogramBins,
  DefaultHistogramOptions,
  HistogramBinningMethod,
  HistogramOptions,
} from '../../../stats/histogram-bins';
import isNumber from 'lodash/isNumber';
import { GraphQLEnumType } from 'graphql';
import { StatsMetricsTypeEnum } from '../scalars';
import { schemaComposer } from 'graphql-compose';
import { aggregateStats } from './utils';

const BinningMethod = new GraphQLEnumType({
  name: 'HistogramBinningMethod',
  description:
    // eslint-disable-next-line max-len
    'The method used to calculate the optimal bin width (and consequently number of bins) for a histogram',
  values: {
    [HistogramBinningMethod.Auto]: {
      value: HistogramBinningMethod.Auto,
      description:
        'Maximum of the ‘Sturges’ and ‘Freedman’ estimators. Provides good all around performance.',
    },
    [HistogramBinningMethod.Sturges]: {
      value: HistogramBinningMethod.Sturges,
      description: 'Calculate the number of bins based on the Sturges method',
    },
    [HistogramBinningMethod.Freedman]: {
      value: HistogramBinningMethod.Freedman,
      description:
        'Calculate the number of histogram bins based on Freedman-Diaconis method',
    },
  },
});

const HistogramInput = schemaComposer.createInputTC({
  name: 'HistogramInput',
  description: 'Records histogram binning data',
  fields: {
    jobName: {
      type: 'String',
      description: 'An optional job name to filter on',
    },
    metric: {
      type: StatsMetricsTypeEnum,
      makeRequired: true,
      defaultValue: 'latency',
      description: 'The metric requested',
    },
    granularity: {
      type: 'StatsGranularity!',
      description: 'Stats snapshot granularity',
    },
    range: {
      type: 'String!',
      description:
        'An expression specifying the range to query e.g. yesterday, last_7days',
    },
    pretty: {
      type: 'Boolean',
      defaultValue: true,
      description: 'Generate a "nice" bin count',
    },
    binCount: {
      type: 'Int',
      description: 'Optional number of bins to select.',
    },
    binMethod: {
      type: BinningMethod,
      description: 'Method used to compute histogram bin count',
      defaultValue: HistogramBinningMethod.Auto,
    },
    minValue: {
      type: 'Float',
      description: 'Optional minimum value to include in counts',
    },
    maxValue: {
      type: 'Float',
      description: 'Optional maximum value to include in counts',
    },
  },
});

const HistogramPayload = schemaComposer.createObjectTC({
  name: 'HistogramPayload',
  description: 'Records histogram binning data',
  fields: {
    total: {
      type: 'Int!',
      description: 'The total number of values.',
    },
    min: {
      type: 'Float!',
      description: 'The minimum value in the data range.',
    },
    max: {
      type: 'Float!',
      description: 'The maximum value in the data range.',
    },
    binWidth: {
      type: 'Float!',
      description: 'The width of the bins',
    },
    bins: schemaComposer.createObjectTC({
      name: 'HistogramBin',
      fields: {
        count: 'Int!',
        x0: {
          type: 'Float!',
          description: 'Lower bound of the bin',
        },
        x1: {
          type: 'Float!',
          description: 'Upper bound of the bin',
        },
      },
    }).List.NonNull,
  },
});

export const histogram: FieldConfig = {
  type: HistogramPayload.NonNull,
  description: 'Compute the histogram of job data.',
  args: {
    input: HistogramInput.NonNull,
  },
  async resolve(_, { input }) {
    const {
      jobName,
      metric,
      granularity,
      range,
      pretty,
      binMethod,
      binCount,
      minValue,
      maxValue,
    } = input;

    const snapshot = await aggregateStats(
      _,
      jobName,
      range,
      metric,
      granularity,
    );

    const opts: HistogramOptions = DefaultHistogramOptions;
    if (isNumber(binCount)) {
      opts.bins = binCount;
    } else if (binMethod !== undefined) {
      opts.bins = binMethod as HistogramBinningMethod;
    }
    if (pretty !== undefined) {
      opts.pretty = !!pretty;
    }

    if (isNumber(minValue) || isNumber(maxValue)) {
      opts.range = [minValue, maxValue];
    }
    return computeHistogramBins(snapshot, opts);
  },
};
