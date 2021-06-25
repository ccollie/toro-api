import { Queue, RedisClient } from 'bullmq';
import { getQueueId, getQueueManager } from '@server/graphql/helpers';
import pMap from 'p-map';

function getStatesKey(queue: Queue, id: string, ...keys: string[]): string {
  const queueId = getQueueId(queue);
  return `${queueId}:${id}:${keys.join(',')}`;
}

interface JobIdStateArgs {
  queue: Queue;
  jobId: string;
  states: string[];
  client: RedisClient;
  index: number;
}

function parseStatesKey(key: string, index: number): JobIdStateArgs {
  const [queueId, jobId, stateStr] = key;
  const mgr = getQueueManager(queueId);
  const queue = mgr.queue;
  const client = mgr.hostManager.client;
  const states = (stateStr ?? '').split(',');
  return {
    queue,
    jobId,
    states,
    client,
    index,
  };
}

async function fetch(
  client: RedisClient,
  items: JobIdStateArgs[],
): Promise<boolean[]> {
  const pipeline = await client.pipeline();
  items.forEach(({ queue, states }) => {});
  const res = await pipeline.exec();
  return res.map((item) => !!item[1]);
}

async function getJobStateStatusBatch(keys: string[]): Promise<boolean[]> {
  const queues: Queue[] = [];
  const queuesByClient = new Map<RedisClient, JobIdStateArgs[]>();
  keys.forEach((key, index) => {
    const meta = parseStatesKey(key, index);
    let items = queuesByClient.get(meta.client);
    if (!items) {
      items = [];
      queuesByClient.set(meta.client, items);
    }
    items.push(meta);
    queues.push(meta.queue);
  });

  const result = new Array<boolean>(keys.length);
  await pMap(queuesByClient.keys(), async (client) => {
    const items = queuesByClient.get(client);
    const results = await fetch(client, items);
    items.forEach((meta, i) => {
      result[meta.index] = results[i];
    });
  });

  return result;
}
