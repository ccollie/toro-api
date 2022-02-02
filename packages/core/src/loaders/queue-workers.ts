import { Queue, RedisClient } from 'bullmq';
import DataLoader from 'dataloader';
import pMap from 'p-map';
import { convertWorker, QueueWorker } from '../queues/queue-worker';
import { aggregateQueuesByClient, mapQueuesToIndex } from './utils';

export async function getQueueWorkers(
  client: RedisClient,
  queues: Queue[],
): Promise<Map<Queue, QueueWorker[]>> {
  const result = new Map<Queue, QueueWorker[]>();
  const queueByClientName = new Map<string, Queue>();
  queues.forEach((queue) => {
    const clientName = (queue as any).clientName();
    queueByClientName.set(clientName, queue);
    result.set(queue, []);
  });

  const keys = Array.from(queueByClientName.keys());

  function parseClientList(list: string) {
    const lines = list.split('\n');
    const clients: { [index: string]: string }[] = [];

    lines.forEach((line: string) => {
      const client: { [index: string]: string } = {};
      const keyValues = line.split(' ');
      keyValues.forEach(function (keyValue) {
        const index = keyValue.indexOf('=');
        const key = keyValue.substring(0, index);
        client[key] = keyValue.substring(index + 1);
      });
      const name = client['name'];
      if (!name) return;

      keys.forEach((key) => {
        if (name.startsWith(key)) {
          const queue = queueByClientName.get(key);
          if (queue) {
            const workers = result.get(queue);
            const workerName = name.substring(key.length + 1);
            client['name'] = workerName ? workerName : queue.name;
            workers.push(convertWorker(client));
          }
        }
      });
    });
    return clients;
  }

  const clients = await client.client('list');
  parseClientList(clients);

  return result;
}

async function getQueueWorkersBatch(queues: Queue[]): Promise<QueueWorker[][]> {
  const result: QueueWorker[][] = [];
  const queueIndexMap = mapQueuesToIndex(queues);
  const hostQueues = aggregateQueuesByClient(queues);

  const hostWorkers = await pMap(hostQueues, ([client, queues]) =>
    getQueueWorkers(client, queues),
  );

  hostWorkers.forEach((workers) => {
    workers.forEach((workers, queue) => {
      const index = queueIndexMap.get(queue);
      result[index] = workers;
    });
  });

  return result;
}

export const workers = new DataLoader(getQueueWorkersBatch);

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

export const workerCount = new DataLoader(getQueueWorkerCountBatch);
