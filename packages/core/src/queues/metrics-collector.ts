import { endOf } from '@alpen/shared';
import { DDSketch } from '@datadog/sketches-js';
import { Queue } from 'bullmq';
import {
  AsyncTask as SchedulerTask,
  SimpleIntervalJob as SchedulerJob,
  ToadScheduler as Scheduler,
} from 'toad-scheduler';
import { HostManager } from '../hosts';
import { StatsGranularity, StatsMetricType } from '../stats';
import { QueueMetricsCollector } from './queue-metrics-collector';

// todo: move to a separate file
export type MetricsConfig = {
  blacklist?: string[];
};

export class MetricsCollector {
  private _queues: Queue[];
  private _scheduler: Scheduler;
  private _schedulerJob: SchedulerJob;
  private _isActive = false;
  private _collectors = new Map<Queue, QueueMetricsCollector>();

  constructor(
    private _host: HostManager,
    private _config: Required<MetricsConfig>,
  ) {
    this._scheduler = new Scheduler();
    this.queues = _host
      .getQueues()
      .filter((q) => !_config.blacklist.includes(q.name));
  }

  startCollecting(): void {
    this._maybeCreateSchedulerJob();
    this._scheduler.addSimpleIntervalJob(this._schedulerJob);
    this._isActive = true;
  }

  stopCollecting(): void {
    this._scheduler.stop();
    this._isActive = false;
  }

  public async extract(
    queue: Queue | string,
    metric: StatsMetricType,
    start = 0,
    end = -1,
    granularity: StatsGranularity = StatsGranularity.Minute,
  ): Promise<Map<number, DDSketch>> {
    const collector = this._getCollector(queue);
    return collector.getSketchRange(metric, start, end, granularity);
  }

  async clear(queue: Queue | string): Promise<void> {
    const collector = this._getCollector(queue);
    await collector?.clear();
  }

  async clearAll(): Promise<void> {
    return this._foreachCollector((collector) => collector.clear());
  }

  get queues(): Queue[] {
    return this._queues;
  }

  set queues(queues: Queue[]) {
    this._queues = queues.filter(
      (q) => !this._config.blacklist.includes(q.name),
    );
    const queuesSet = new Set(this._queues);
    this._collectors.forEach((_, queue) => {
      if (!queuesSet.has(queue)) {
        this._collectors.delete(queue);
      }
    });
  }

  private _maybeCreateSchedulerJob() {
    if (!this._schedulerJob) {
      const task = new SchedulerTask('collect-metrics', this._taskFn.bind(this));
      const start = endOf(new Date(), 'minute').getTime();
      this._schedulerJob = new SchedulerJob({
        milliseconds: 1000 * 60,
        runImmediately: false,
      }, task);
      setTimeout(() => {
        this._schedulerJob.start();
      }, start - Date.now());
    }
  }

  private _taskFn = async () => {
    const timestamp = Date.now();
    return this._foreachCollector(async (collector) => {
      await collector.update(timestamp);
    });
  };

  private async _foreachCollector(
    cb: (collector: QueueMetricsCollector) => void | Promise<void>,
  ): Promise<void> {
    const collectors = Array.from(this._collectors.values());
    await Promise.all(collectors.map(cb));
  }

  private _getCollector(queue: Queue | string): QueueMetricsCollector {
    const q = this._getQueue(queue);
    const c = this._collectors.get(q);
    if (!c) {
      throw new Error(`No metrics collected for queue ${q.name}`);
    }
    return c;
  }

  private _getQueue(queue: Queue | string): Queue {
    if (typeof queue === 'string') {
      const id = queue;
      queue = this._host.getQueueById(queue);
      if (!queue) {
        throw new Error(`Queue ${id} not found`);
      }
    }
    return queue;
  }

  private get _redisClient() {
    return this._host.client;
  }
}
