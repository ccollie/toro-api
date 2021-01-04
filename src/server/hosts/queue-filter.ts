import { HostManager } from './host-manager';
import { Queue } from 'bullmq';
import { escapeRegExp } from '../lib';
import { checkMultiErrors } from '../redis';

export interface QueueFilter {
  search?: string;
  prefix?: string;
  isActive?: boolean;
  isPaused?: boolean;
}

export async function getFilteredQueues(
  manager: HostManager,
  filter?: QueueFilter,
): Promise<Queue[]> {
  let queues = manager.getQueues();
  if (!filter) return queues;
  const { search, isActive, isPaused, prefix } = filter;
  if (!search && !prefix && isActive === undefined && isPaused === undefined) {
    return queues;
  }
  if (search) {
    const regex = new RegExp(escapeRegExp(search), 'i');
    queues = queues.filter((queue) => queue.name.match(regex));
  }
  if (prefix) {
    queues = queues.filter((queue) => {
      return queue.opts.prefix?.startsWith(prefix);
    });
  }
  if (isActive !== undefined || isPaused !== undefined) {
    const pipeline = manager.client.pipeline();
    const valid = new Set(Array.from(queues));

    if (isPaused !== undefined) {
      queues.forEach((queue) => {
        pipeline.hexists(queue.keys.meta, 'paused');
      });
    }
    if (isActive !== undefined) {
      pipeline.client('list');
      // count active jobs
    }
    const response = await pipeline.exec().then(checkMultiErrors);
    if (isPaused !== undefined) {
      queues.forEach((queue) => {
        const paused = 1 === response.shift();
        if (paused !== isPaused) valid.delete(queue);
      });
    }
    if (isActive !== undefined) {
      const clientList = response[response.length - 1];
      const list = queues.length !== valid.size ? Array.from(valid) : queues;
      const queuesWithWorkers = parseClientList(list, clientList);
      if (!!isActive) {
        return queuesWithWorkers;
      } else {
        queuesWithWorkers.forEach((queue) => {
          valid.delete(queue);
        });
        return Array.from(valid);
      }
    }
  }

  return queues;
}

function parseClientList(queues: Queue[], list: string): Queue[] {
  const resultSet = new Set<Queue>();
  const result: Queue[] = [];
  const lines = list.split('\n');

  lines.forEach((line: string) => {
    const keyValues = line.split(' ');
    for (let i = 0; i < keyValues.length; i++) {
      const keyValue = keyValues[i];
      const index = keyValue.indexOf('=');
      const key = keyValue.substring(0, index);
      const value = keyValue.substring(index + 1);
      if (key === 'name') {
        if (value) {
          const queue = queues.find((queue) => {
            return value.startsWith((queue as any).clientName());
          });
          if (queue && !resultSet.has(queue)) {
            resultSet.add(queue);
            result.push(queue);
          }
        }
        break;
      }
    }
  });

  return result;
}
