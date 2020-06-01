import { FieldConfig } from '../../utils';
import { HostManager } from '../../../../hosts';
import { RedisMetrics } from '../../../../../types';
import { RedisInfoTC } from './RedisInfo';

export const hostRedisFC: FieldConfig = {
  type: RedisInfoTC.NonNull,
  resolve: (host: HostManager): Promise<RedisMetrics> => {
    return host.getRedisInfo();
  },
};
