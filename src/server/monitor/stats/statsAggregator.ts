import { Queue } from 'bullmq';
import { StatsClient } from './statsClient';
import cron from 'node-cron';
import { random } from 'lodash';
import PQueue from 'p-queue';
import { QueueConfig } from '@src/types';
import { systemClock } from '../../lib/clock';

const CONFIG = {
  units: ['minutes', 'hours', 'days', 'weeks'],
  cronExpressions: ['* * * * *', '0 * * * *', '0 0 * * *', '0 0 * * 0'],
};

const ONE_SECOND = 1000;

/**
 * Manages rollups and maintenance of queue stats
 */
export class StatsAggregator {
  private readonly host: string;
  private readonly queue: Queue;
  private readonly queueConfig: QueueConfig;
  private readonly activeJobs: Set<any>;
  private readonly statsClient: StatsClient;
  private readonly workQueue: PQueue;
  private _done: boolean;
  private _started: number;
  private _tasks: any[];
  private readonly _destroyWorkQueue: boolean;

  constructor(
    host: string,
    queue: Queue,
    config: QueueConfig,
    statsClient: StatsClient,
    workQueue: PQueue,
  ) {
    this.queue = queue;
    this.queueConfig = config;
    this.host = host;
    this.statsClient = statsClient;
    this.workQueue = workQueue;

    this.activeJobs = new Set();
    const run = this.run.bind(this);
    this._tasks = CONFIG.units.reduce((res, unit, index) => {
      const expr = CONFIG.cronExpressions[index];
      const task = cron.schedule(expr, () => run(unit), {
        scheduled: false,
      });

      res.push(task);
      return res;
    }, []);

    this.workQueue = workQueue || new PQueue();
    this._destroyWorkQueue = !workQueue;

    this._started = systemClock.now();
    this._done = false;
  }

  destroy(): void {
    this._done = true;
    this._tasks.forEach((task) => task.destroy());
    this._destroyWorkQueue && this.workQueue.clear();
  }

  start(): void {
    this._done = false;
    this._tasks.forEach((task) => task.start());
  }

  clear(): void {
    this._done = true;
    this._tasks.forEach((task) => task.stop());
  }

  get hasLock(): boolean {
    return this.statsClient.hasLock;
  }

  getJobTypes(): string[] {
    const cfg = this.queueConfig;
    return cfg && cfg.jobTypes && Array.isArray(cfg.jobTypes)
      ? cfg.jobTypes
      : [];
  }

  async rollup(unit: string) {
    const types = ['latency', 'wait'];

    const actions = types.map((type) => {
      return () => this.statsClient.rollup(null, type, unit);
    });

    this.getJobTypes().forEach((jobType) => {
      types.forEach((type) => {
        actions.push(() => this.statsClient.rollup(jobType, type, unit));
      });
    });

    // todo: also aggregate at the host level
    return this.workQueue.addAll(actions);
  }

  run(unit: string): void {
    if (this._done) return;
    if (this.hasLock) {
      // add a fudge factor to ensure we encompass the end of
      // the range
      const jitter = random(1, 3) * ONE_SECOND;
      const timeout = setTimeout(async () => {
        if (!this.activeJobs.has(unit)) {
          this.activeJobs.add(unit);
          try {
            await this.rollup(unit);
          } finally {
            this.activeJobs.delete(unit);
          }
        }
      }, jitter);
      timeout.unref();
    }
  }
}
