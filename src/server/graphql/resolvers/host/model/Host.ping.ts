import { FieldConfig } from '../../utils';
import { HostManager } from '@server/hosts';
import { schemaComposer } from 'graphql-compose';
import { performance } from 'perf_hooks';

export const PingTC = schemaComposer.createObjectTC({
  name: 'PingPayload',
  fields: {
    latency: 'Int!',
  },
});

export const ping: FieldConfig = {
  type: PingTC.NonNull,
  resolve: async (host: HostManager): Promise<{ latency: number }> => {
    const start = performance.now();
    await host.client.ping();
    const end = performance.now();
    const latency = end - start;
    return { latency };
  },
};
