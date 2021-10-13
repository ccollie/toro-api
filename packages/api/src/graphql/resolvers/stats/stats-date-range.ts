import { normalizeGranularity } from '../stats/utils';
import { FieldConfig } from '../index';
import { HostManager } from '@alpen/core/hosts';
import { getClient } from './utils';
import { StatsGranularityEnum, TimeSpanTC } from '../../scalars';
import { schemaComposer } from 'graphql-compose';
import { StatsGranularity } from '@alpen/core/stats';

const StatsSpanInput = schemaComposer.createInputTC({
  name: 'StatsSpanInput',
  fields: {
    id: {
      type: 'ID!',
      description: 'The host/queue to query',
    },
    jobName: 'String',
    granularity: StatsGranularityEnum,
  },
});

export const statsDateRange: FieldConfig = {
  type: TimeSpanTC,
  description: 'Gets the time range of recorded stats for a queue/host',
  args: {
    input: StatsSpanInput.NonNull,
  },
  async resolve(_, { input }, context) {
    const { jobName, granularity = StatsGranularity.Minute } = input;

    const client = getClient(context, _);
    const _granularity = normalizeGranularity(granularity);
    if (_ instanceof HostManager) {
      return client.getHostSpan(jobName, 'latency', _granularity);
    }
    return client.getSpan(jobName, 'latency', _granularity);
  },
};
