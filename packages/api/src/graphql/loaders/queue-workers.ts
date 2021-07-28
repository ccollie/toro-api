import pMap from 'p-map';
import { Queue } from 'bullmq';
import DataLoader from 'dataloader';
import { HostManager, QueueWorker } from '@alpen/core';
import { getQueueHostManager } from '../helpers';
import { mapQueuesToIndex, queueCacheFn } from './utils';
import { RegisterFn } from './types';

async function getQueueWorkersBatch(queues: Queue[]): Promise<QueueWorker[][]> {
  const hosts = new Set<HostManager>();
  const result: QueueWorker[][] = [];
  const queueIndexMap = mapQueuesToIndex(queues);
  queues.forEach((q, index) => {
    const host = getQueueHostManager(q);
    hosts.add(host);
    result[index] = [];
  });

  const hostWorkers = await pMap(hosts, (h) => h.getQueueWorkers());

  hostWorkers.forEach((workers) => {
    workers.forEach((workers, queue) => {
      const index = queueIndexMap.get(queue);
      result[index] = workers;
    });
  });

  return result;
}

export default function registerLoaders(register: RegisterFn): void {
  const workersFactory = () =>
    new DataLoader(getQueueWorkersBatch, {
      cacheKeyFn: queueCacheFn,
    });

  const workerCountFactory = (workers) => {
    async function getQueueWorkerCountBatch(
      queues: Queue[],
    ): Promise<(number | Error)[]> {
      const loaded = (await workers.loadMany(queues)) as Array<
        Error | QueueWorker[]
      >;
      return loaded.map((w) => {
        if (Array.isArray(w)) return w.length;
        return w;
      });
    }

    return new DataLoader(getQueueWorkerCountBatch, {
      cacheKeyFn: queueCacheFn,
    });
  };

  register('workers', workersFactory);
  register('workerCount', workerCountFactory, ['workers']);
}
