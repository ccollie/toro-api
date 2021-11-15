import { FieldConfig } from '../../utils';
import { HostManager } from '@alpen/core';
import { RedisMetrics } from '@alpen/core';
import { RedisInfoTC } from './RedisInfo';

export const hostRedisFC: FieldConfig = {
  type: RedisInfoTC.NonNull,
  resolve: (host: HostManager): Promise<RedisMetrics> => {
    return host.getRedisInfo();
  },
};
