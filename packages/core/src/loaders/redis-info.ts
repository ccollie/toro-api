import { getHostById } from './accessors';
import { HostManager } from '../hosts';
import { RedisClient } from 'bullmq';
import DataLoader from 'dataloader';
import pMap from 'p-map';
import { getRedisInfo, RedisMetrics } from '../redis';

export async function getRedisInfoBatch(hosts: HostManager[]): Promise<Array<RedisMetrics>> {
  const clients = new Set<RedisClient>();
  const clientsToIndex = new Map<RedisClient, number>();
  hosts.forEach((host, index) => {
    clientsToIndex.set(host.client, index);
    clients.add(host.client);
  });

  const resultMap = new Map<RedisClient, RedisMetrics>();
  await pMap(clients, async (client) => {
    const info = await getRedisInfo(client);
    resultMap.set(client, info);
    return info;
  }, { concurrency: 6 });

  return hosts.map(x => resultMap.get(x.client));
}

async function getRedisInfoByHostIds(ids: string[]): Promise<Array<RedisMetrics>> {
  const hosts = ids.map(getHostById);
  return getRedisInfoBatch(hosts);
}

export const redisInfoByHostId = new DataLoader(getRedisInfoByHostIds);
export const redisInfoByHost = new DataLoader(getRedisInfoBatch);
