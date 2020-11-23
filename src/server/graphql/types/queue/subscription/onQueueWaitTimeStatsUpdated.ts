import { getQueueStatsUpdateFC } from './queueStatsUpdated';

export const onQueueWaitTimeStatsUpdated = getQueueStatsUpdateFC('wait');
