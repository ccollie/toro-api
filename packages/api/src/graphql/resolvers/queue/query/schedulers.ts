import { Queue } from 'bullmq';
import { QueueWorkerTC } from './workers';
import { FieldConfig } from '../../utils';
import { convertWorker, QueueWorker } from '@alpen/core';

const QueueScheduler = QueueWorkerTC.clone('QueueScheduler');

export const schedulers: FieldConfig = {
  args: {
    limit: 'Int',
  },
  type: QueueScheduler.NonNull.List.NonNull,
  async resolve(
    queue: Queue,
    args: any,
  ): Promise<QueueWorker[]> {
    const res = await queue.getQueueSchedulers();
    let schedulers = res.map(convertWorker).sort((a, b) => a.idle - b.idle);
    if (args.limit) {
      const limit = parseInt(args.limit);
      schedulers = schedulers.slice(0, limit - 1);
    }
    return schedulers;
  },
};
