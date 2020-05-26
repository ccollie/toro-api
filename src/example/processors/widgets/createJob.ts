import { rand } from '../utils';
import { Job, JobsOptions, Queue } from 'bullmq';
import { chooseProductNames, chooseProductName } from './utils';
import { getOrderNumber } from '../utils';

export function createJob(queue: Queue, orderNumber: string): Promise<Job> {
  orderNumber = orderNumber || getOrderNumber();
  const product = chooseProductName();
  const partCount = rand(4, 8);
  const parts = chooseProductNames(partCount);

  console.log(`${queue.name}: Materializing #${orderNumber} ${product}`);
  const opts: JobsOptions = { delay: 0 };
  if (Math.random() < 0.2) {
    opts.delay = rand(3000, 25000);
  }
  return queue.add(
    'widget',
    { product, parts, orderNumber, queue: queue.name },
    opts,
  );
}

module.exports = createJob;
