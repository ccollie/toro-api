import {
  RedisStreamAggregator,
  RedisStreamAggregatorOptions,
} from '../../src/server/redis';
import { DEFAULT_CLIENT_OPTIONS } from './client';

export function createRedisStreamAggregator(
  options?: Partial<RedisStreamAggregatorOptions>,
) {
  return new RedisStreamAggregator({
    connectionOptions: DEFAULT_CLIENT_OPTIONS,
    ...(options || {}),
  });
}
