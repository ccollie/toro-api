import { FieldConfig } from '../../utils';
import { HostManager } from '@server/hosts';
import { RedisMetrics } from '@src/types';
import { RedisInfoTC } from './RedisInfo';

export const hostRedisFC: FieldConfig = {
  type: RedisInfoTC.NonNull,
  resolve: (host: HostManager): Promise<RedisMetrics> => {
    return host.getRedisInfo();
  },
};
