process.env.NODE_ENV = 'example';
import { HostConfig } from '@alpen/core';
import { Worker, QueueScheduler, MetricsTime } from 'bullmq';
import { tacos, widgets, backup, DemoHosts } from './processors/index';

export class Consumer {
  private tacoWorker: Worker;
  private widgetWorker: Worker;
  private backupWorker: Worker;
  private backupScheduler: QueueScheduler;

  constructor() {
    this.tacoWorker = new Worker('tacos', tacos.process, {
      concurrency: 10,
      metrics: {
        maxDataPoints: MetricsTime.ONE_MONTH,
      }
    });
    this.widgetWorker = new Worker('widgets', widgets.process, {
      concurrency: 10,
      metrics: {
        maxDataPoints: MetricsTime.ONE_MONTH,
      }
    });
    this.backupWorker = new Worker('backup', backup.process, {
      concurrency: 2,
      metrics: {
        maxDataPoints: MetricsTime.ONE_MONTH,
      }
    });
    this.backupScheduler = new QueueScheduler('backup');
  }

  static get hosts(): HostConfig[] {
    return DemoHosts;
  }

  async destroy(): Promise<void> {
    await Promise.all([
      this.tacoWorker.close(),
      this.widgetWorker.close(),
      this.backupWorker.close(),
      this.backupScheduler.close(),
    ]);
  }
}
