import {
  RedisStreamAggregator,
  RedisStreamAggregatorOptions,
} from '../../redis';
import { DEFAULT_CONNECTION_OPTIONS } from './client';

export function createRedisStreamAggregator(
  options?: Partial<RedisStreamAggregatorOptions>,
): RedisStreamAggregator {
  return new RedisStreamAggregator({
    connection: DEFAULT_CONNECTION_OPTIONS,
    ...(options || {}),
  });
}
