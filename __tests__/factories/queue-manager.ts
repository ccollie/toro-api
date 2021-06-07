import { createQueue } from './queue';
import { QueueConfig } from '@src/types';
import { nanoid } from 'nanoid';
import { QueueManager } from '@src/server/queues';
import { HostManager } from '@src/server/hosts';
import { Queue } from 'bullmq';
import { createHostManager } from './host-manager';

export function createQueueManager(
  queue?: Queue,
  host?: HostManager,
): QueueManager {
  host = host ?? createHostManager();
  queue =
    queue ??
    createQueue(null, {
      connection: host.client,
    });

  const config: QueueConfig = {
    id: nanoid(),
    name: queue.name,
    prefix: queue.opts.prefix,
  };

  process.env.QUEUE_URI_TEMPLATE =
    '{{server.host}}:{{server.port}}/queues/{{queue.id}}';
  return new QueueManager(host, queue, config);
}
