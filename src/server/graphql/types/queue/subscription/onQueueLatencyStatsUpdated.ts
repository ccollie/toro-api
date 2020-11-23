import { getQueueStatsUpdateFC } from './queueStatsUpdated';

export const onQueueLatencyStatsUpdated = getQueueStatsUpdateFC('latency');
