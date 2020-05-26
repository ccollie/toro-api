import { get } from 'lodash';
import { Supervisor, QueueWorker } from '../../../common/imports';
import { Queue } from 'bullmq';
import { Rule } from '../../../../monitor/rules';
import { StatisticalSnapshot } from 'stats';
import { getStats } from './getStats';

export const model = {
  id(parent, args, { supervisor }): string {
    const manager = (supervisor as Supervisor).getQueueManager(parent);
    return manager.id;
  },
  prefix(queue: Queue): string {
    return queue.opts.prefix;
  },
  isPaused(queue: Queue, _, { supervisor }): Promise<boolean> {
    const manager = supervisor.getQueueManager(queue);
    return manager.isPaused();
  },
  async workers(parent, args, { supervisor }): Promise<QueueWorker[]> {
    const manager = (supervisor as Supervisor).getQueueManager(parent);
    let workers = await manager.getWorkers();
    workers = workers.map((worker) => {
      //worker.host = parent.host;
      return worker;
    });
    if (args.limit) {
      workers = workers.sort((a, b) => a.idle - b.idle);
      workers = workers.slice(0, args.limit - 1);
    }
    return workers;
  },
  async jobCounts(
    queue: Queue,
    args,
    ctx,
    info,
  ): Promise<Record<string, number>> {
    // get field names/states
    const fields = get(info, 'fieldNodes[0].selectionSet.selections', []);
    const states = fields.map((node) => node.name.value);
    return queue.getJobCounts(...states);
  },
  async jobs(queue: Queue, args, { supervisor }): Promise<any> {
    const { offset, limit, state, asc } = args;
    const manager = (supervisor as Supervisor).getQueueManager(queue);
    // todo: check out requested fields. If "state" is requested
    // use the optimized method to get states in bulk
    return manager.getJobs(state, offset, limit, asc);
  },
  async repeatableJobs(queue: Queue, args, { supervisor }): Promise<any> {
    const { offset, limit, asc } = args;
    const manager = supervisor.getQueueManager(queue);
    return manager.getRepeatableJobs(offset, limit, asc);
  },
  async repeatableCount(queue: Queue, args, { supervisor }): Promise<number> {
    const manager = supervisor.getQueueManager(queue);
    return manager.getRepeatableCount();
  },
  rules(queue: Queue, args, { supervisor }): Rule[] {
    const manager = supervisor.getQueueManager(queue);
    return manager.rules;
  },
  async latency(queue: Queue, args, context): Promise<StatisticalSnapshot[]> {
    return getStats('latency', queue, args, context);
  },
  async waitTimes(queue: Queue, args, context): Promise<StatisticalSnapshot[]> {
    return getStats('wait', queue, args, context);
  },
};
