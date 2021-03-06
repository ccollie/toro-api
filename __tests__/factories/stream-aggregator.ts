import {
  RedisStreamAggregator,
  RedisStreamAggregatorOptions,
} from '../../src/server/redis';
import { DEFAULT_CONNECTION_OPTIONS } from './client';

export function createRedisStreamAggregator(
  options?: Partial<RedisStreamAggregatorOptions>,
): RedisStreamAggregator {
  return new RedisStreamAggregator({
    connectionOptions: DEFAULT_CONNECTION_OPTIONS,
    ...(options || {}),
  });
}
