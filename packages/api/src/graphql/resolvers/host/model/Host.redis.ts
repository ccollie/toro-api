import { HostManager, RedisMetrics } from '@alpen/core';
import { FieldConfig } from '../../utils';
import { RedisInfoTC } from './RedisInfo';

export const hostRedisFC: FieldConfig = {
  type: RedisInfoTC.NonNull,
  resolve: (host: HostManager): Promise<RedisMetrics> => {
    return host.getRedisInfo();
  },
};
