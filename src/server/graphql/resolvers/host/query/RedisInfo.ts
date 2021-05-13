import { schemaComposer } from 'graphql-compose';

export const RedisInfoTC = schemaComposer.createObjectTC({
  name: 'RedisInfo',
  fields: {
    redis_version: 'String!',
    tcp_port: 'Int!',
    uptime_in_seconds: 'Int!',
    uptime_in_days: 'Int!',
    connected_clients: 'Int!',
    blocked_clients: 'Int!',
    total_system_memory: 'Int!',
    used_memory: 'Int!',
    used_memory_peak: 'Int!',
    used_memory_lua: 'Int!',
    used_cpu_sys: 'Float!',
    maxmemory: 'Int!',
    number_of_cached_scripts: 'Int!',
    instantaneous_ops_per_sec: 'Int!',
    mem_fragmentation_ratio: 'Float',
    role: 'String!',
    os: 'String!',
  },
});
