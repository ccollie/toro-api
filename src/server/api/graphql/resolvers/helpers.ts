import { Queue } from 'bullmq';
import {
  QueueManager,
  QueueListener,
  Supervisor,
  HostManager,
} from '../../common/imports';
import { get } from 'lodash';
import { parseDate } from '../../../lib/datetime';
import { systemClock } from '../../../lib/clock';
import { isBefore } from 'date-fns';

export function getSupervisor(context): Supervisor {
  return context.supervisor as Supervisor;
}

export function getQueueById(context, id: string): Queue {
  return getSupervisor(context).getQueueById(id);
}

export function getQueueManager(context, id): QueueManager {
  return getSupervisor(context).getQueueManager(id);
}

export function getQueueHost(context, queueId): HostManager {
  const supervisor = getSupervisor(context);
  const manager = supervisor.getQueueManager(queueId);
  return supervisor.getHost(manager && manager.host);
}

export function getQueueListener(context, id): QueueListener {
  const manager = getSupervisor(context).getQueueManager(id);
  return manager && manager.queueListener;
}

export function getQueryFields(info): string[] {
  return get(info, 'fieldNodes[0].selectionSet.selections', []);
}

export function parseRangeQuery(options: any = {}) {
  let { start, end } = options;
  const { unit } = options;
  const now = systemClock.now();
  if (start) {
    start = parseDate(start, now);
    if (end) {
      end = parseDate(end, now);
    } else if (start && isBefore(start, now)) {
      end = new Date(now);
    }
  }
  return { start, end };
}
