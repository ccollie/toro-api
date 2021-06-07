import { HostManager } from './host-manager';
import { Queue } from 'bullmq';
import { escapeRegExp } from '../lib';
import { checkMultiErrors } from '../redis';

export enum QueueFilterStatus {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE',
  Paused = 'PAUSED',
  Running = 'RUNNING',
}

export interface QueueFilter {
  search?: string;
  prefix?: string;
  statuses?: QueueFilterStatus[];
}

export async function getFilteredQueues(
  manager: HostManager,
  filter?: QueueFilter,
): Promise<Queue[]> {
  let queues = manager.getQueues();
  if (!filter) return queues;
  const { search, prefix, statuses } = filter;
  if (!search && !prefix && !statuses?.length) {
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
  // queues = queues.filter((queue) => excludeSet.has(queue.id));
  if (statuses && statuses.length) {
    const pipeline = manager.client.pipeline();
    const valid = new Set(Array.from(queues));

    const checkPaused = statuses.includes(QueueFilterStatus.Paused);
    const checkRunning = statuses.includes(QueueFilterStatus.Running);

    const checkActive = statuses.includes(QueueFilterStatus.Active);
    const checkInactive = statuses.includes(QueueFilterStatus.Inactive);

    if (checkPaused || checkRunning) {
      queues.forEach((queue) => {
        pipeline.hexists(queue.keys.meta, 'paused');
      });
    }
    if ((checkActive || checkInactive) && !(checkActive && checkInactive)) {
      pipeline.client('list');
      // count active jobs
    }
    let isValid = true;

    const response = await pipeline.exec().then(checkMultiErrors);
    if (checkPaused || checkRunning) {
      queues.forEach((queue) => {
        const paused = 1 === response.shift();
        if (paused) {
          isValid = checkPaused;
        } else {
          isValid = checkRunning;
        }
        if (!isValid) valid.delete(queue);
      });
    }

    if (checkInactive && checkInactive) {
      return Array.from(valid);
    } else {
      const clientList = response[response.length - 1];
      const list = queues.length !== valid.size ? Array.from(valid) : queues;
      const queuesWithWorkers = parseClientList(list, clientList);

      if (checkActive) {
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

// todo: cache this. Do workers change frequently ?
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
