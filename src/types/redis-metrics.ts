export type RedisMetrics = {
  /* eslint-disable */
  redis_version: string;
  tcp_port: number;
  role: string;
  uptime_in_seconds: number;
  uptime_in_days: number;
  total_system_memory: number;
  used_cpu_sys: number;
  used_memory: number;
  used_memory_rss: number;
  used_memory_lua: number;
  used_memory_peak: number;
  maxmemory: number;
  mem_fragmentation_ratio: number;
  connected_clients: number;
  blocked_clients: number;
  number_of_cached_scripts: number;
  instantaneous_ops_per_sec: number;
  os: string;
  /* eslint-enable */
};
