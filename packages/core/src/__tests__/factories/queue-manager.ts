import { createQueue } from './queue';
import { HostManager, QueueConfig } from '../../hosts';
import { nanoid } from 'nanoid';
import { QueueManager } from '../../queues';
import { Queue } from 'bullmq';
import { createHostManager } from './host-manager';

export async function createQueueManager(
  queue?: Queue,
  host?: HostManager,
): Promise<QueueManager> {
  if (!queue) {
    const opts = host?.client ? { connection: host.client } : {};
    queue =
      await createQueue(null, opts);
  }

  const config: QueueConfig = {
    id: nanoid(),
    name: queue.name,
    prefix: queue.opts?.prefix ?? 'bull',
  };

  host = host ?? await createHostManager({
    queues: [config]
  });

  process.env.QUEUE_URI_TEMPLATE =
    '{{server.host}}:{{server.port}}/queues/{{queue.id}}';
  return new QueueManager(host, queue, config);
}
