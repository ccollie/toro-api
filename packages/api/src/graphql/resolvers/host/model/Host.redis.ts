import { FieldConfig } from '../../utils';
import { HostManager } from '@alpen/core/hosts';
import { RedisMetrics } from '@alpen/core/redis';
import { RedisInfoTC } from './RedisInfo';

export const hostRedisFC: FieldConfig = {
  type: RedisInfoTC.NonNull,
  resolve: (host: HostManager): Promise<RedisMetrics> => {
    return host.getRedisInfo();
  },
};
