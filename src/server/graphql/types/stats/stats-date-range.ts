import { normalizeGranularity } from '../../helpers';
import { FieldConfig } from '../../types';
import { HostManager } from '../../../hosts';
import { getClient } from './utils';
import { StatsGranularityEnum } from '../../types/scalars';
import { schemaComposer } from 'graphql-compose';
import { StatsGranularity } from '../../../../types';

const StatsSpanPayload = schemaComposer.createObjectTC({
  name: 'StatsSpanPayload',
  fields: {
    start: 'Date!',
    end: 'Date!',
  },
});

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
  type: StatsSpanPayload,
  description: 'Gets the time range of recorded stats for a queue/host',
  args: {
    input: StatsSpanInput.NonNull,
  },
  async resolve(_, { input }) {
    const { jobName, granularity = StatsGranularity.Minute } = input;

    const client = getClient(_);
    const _granularity = normalizeGranularity(granularity);
    if (_ instanceof HostManager) {
      return client.getHostSpan(jobName, 'latency', _granularity);
    }
    return client.getSpan(jobName, 'latency', _granularity);
  },
};
