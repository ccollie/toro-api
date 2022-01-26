import { getOrderNumber, getRandomString } from '../utils';
import { random as getRandomInt, sample } from '@alpen/shared';
import { Job, Queue } from 'bullmq';
const STAGES = ['download', 'transcode', 'metadata', 'upload'];

const log = console.log.bind(console);

const EXTS = ['.wmv', '.mpg', '.mpeg'];

function generateFileName(length = 15): string {
  return getRandomString(length) + sample(EXTS);
}

function createData(): object {
  return {
    filename: generateFileName(),
    destination: generateFileName(),
    size: getRandomInt(100, 400) * 1000000,
    stage: STAGES[0],
  };
}

export function createJob(queue: Queue, orderNumber: string): Promise<Job> {
  orderNumber = orderNumber || getOrderNumber();
  const data = createData();
  log(`${queue.name}: Transcoding #${orderNumber} ${data['filename']}`);
  return queue.add(data['stage'], { ...data, orderNumber, queue: queue.name });
}
