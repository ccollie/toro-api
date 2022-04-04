import { MetricsTimeseries, Scripts } from '@alpen/core';
import { Queue } from 'bullmq';
import { schemaComposer } from 'graphql-compose';
import { TimeseriesDataPointTC } from '../../stats/types';
import { FieldConfig } from '../../utils';

const MetricTypeEnumTC = schemaComposer.createEnumTC({
  name: 'MetricStatusType',
  values: {
    failed: { value: 'failed' },
    completed: { value: 'completed' },
  },
});

const MetaTC = schemaComposer.createObjectTC({
  name: 'TimeseriesMeta',
  fields: {
    startTs: {
      type: 'Int!',
      description:
        'Unix timestamp (millis) of the first datapoint of the timeseries',
    },
    endTs: {
      type: 'Int!',
      description:
        'Unix timestamp (millis) of the last datapoint of the timeseries',
    },
    count: {
      type: 'Int!',
      description: 'Number of total datapoints in the timeseries',
    },
  },
});

const MetricsTimeseriesTC = schemaComposer.createObjectTC({
  name: 'MetricsTimeseries',
  fields: {
    meta: {
      type: MetaTC.NonNull,
      description: 'Metadata about the timeseries',
    },
    data: {
      type: TimeseriesDataPointTC.NonNull.List.NonNull,
      description: 'The data points for the timeseries.',
    },
  },
});

const MetricsDataInputTC = schemaComposer.createInputTC({
  name: 'MetricsDataInput',
  fields: {
    type: {
      type: MetricTypeEnumTC.NonNull,
      description: 'The type of metric to fetch',
    },
    start: {
      type: 'DateTime',
      description: 'The start of the date range to query',
    },
    end: {
      type: 'DateTime',
      description: 'The end of the date range to query',
    },
  },
});

export const metricsData: FieldConfig = {
  type: MetricsTimeseriesTC,
  args: { input: MetricsDataInputTC },
  async resolve(
    queue: Queue,
    {
      input: { type, start, end },
    }: {
      input: { type: 'failed' | 'completed'; start?: Date; end?: Date };
    },
  ): Promise<MetricsTimeseries> {
    return await Scripts.getMetricsDateRange(queue, type, start, end);
  },
};
