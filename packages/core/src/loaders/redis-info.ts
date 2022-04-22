import { getHostById, getQueueHost } from './accessors';
import { HostManager } from '../hosts';
import { Queue, RedisClient } from 'bullmq';
import DataLoader from 'dataloader';
import pMap from 'p-map';
import { getRedisInfo, RedisMetrics } from '../redis';

export async function getRedisInfosByClient(clients: RedisClient[]): Promise<Array<RedisMetrics>> {
  const uniqClients = new Set<RedisClient>(clients);
  const resultMap = new Map<RedisClient, RedisMetrics>();
  await pMap(uniqClients, async (client) => {
    const info = await getRedisInfo(client);
    resultMap.set(client, info);
    return info;
  }, { concurrency: 6 });

  return clients.map(client => resultMap.get(client));
}

export async function getRedisInfoBatch(hosts: HostManager[]): Promise<Array<RedisMetrics>> {
  const clients = hosts.map(host => host.client);
  return getRedisInfosByClient(clients);
}

async function getRedisInfoByHostIds(ids: string[]): Promise<Array<RedisMetrics>> {
  const hosts = ids.map(getHostById);
  return getRedisInfoBatch(hosts);
}

export const redisInfoByHostId = new DataLoader(getRedisInfoByHostIds);
export const redisInfoByHost = new DataLoader(getRedisInfoBatch);

export async function getRedisInfoByQueue(queue: Queue): Promise<RedisMetrics> {
  // use client from host for max reuse
  const host = getQueueHost(queue);
  return redisInfoByHost.load(host);
}
