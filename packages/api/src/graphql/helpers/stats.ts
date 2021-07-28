import { StatsClient } from '@alpen/core';
import { getQueueManager } from './accessors';
import { StatsGranularity } from '@alpen/core';
import { Queue } from 'bullmq';

export function getStatsClient(queue: string | Queue): StatsClient {
  const manager = getQueueManager(queue);
  return manager && manager.statsClient;
}

export function normalizeGranularity(granularity: string): StatsGranularity {
  return (
    granularity ? granularity.toLowerCase() : granularity
  ) as StatsGranularity;
}
