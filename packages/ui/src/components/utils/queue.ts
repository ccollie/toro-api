import type { Queue, QueueFragment } from '@/types';
import { StatusColor } from '@/styles/colors';

export function getQueueStateColor(queue: Queue | QueueFragment): StatusColor {
  // todo: from theme
  let color = 'teal';
  if (queue.isPaused) {
    color = 'gray';
  } else if (!queue.workerCount) {
    color = 'red';
  }
  return color as StatusColor;
}

export function getQueueStateText(queue: Queue | QueueFragment): string {
  let state = 'Active';
  if (queue.isPaused) {
    state = 'Paused';
  } else if (!queue.workerCount) {
    state = 'Inactive';
  }
  return state;
}
