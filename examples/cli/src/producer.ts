import { HostConfig } from '@alpen/core';

process.env.NODE_ENV = 'example';
import { Queue } from 'bullmq';
import { tacos, widgets, backup, DemoHosts } from './processors/index';

export class Producer {
  private isStopped = false;
  private tacoQueue: Queue;
  private widgetQueue: Queue;
  private backupQueue: Queue;
  private timeouts = new Map<Queue, ReturnType<typeof setTimeout>>();

  constructor() {
    this.tacoQueue = new Queue('tacos');
    this.widgetQueue = new Queue('widgets');
    this.backupQueue = new Queue('backup');
  }

  static get hosts(): HostConfig[] {
    return DemoHosts;
  }

  async run(): Promise<void> {
    if (this.isStopped) {
      await backup.createScheduledJobs(this.backupQueue);
      await this.keepProducingJobs(this.tacoQueue, tacos.createJob, 1, 10);
      await this.keepProducingJobs(this.widgetQueue, widgets.createJob, 1, 5);
    }
  }

  async destroy(): Promise<void> {
    this.isStopped = true;
    for (const timeout of this.timeouts.values()) {
      try {
        clearTimeout(timeout);
      } catch (e) {
        console.log(e);
      }
    }

    await Promise.all([
      this.tacoQueue.close(),
      this.widgetQueue.close(),
      this.backupQueue.close(),
    ]);
  }

  async keepProducingJobs(
    queue,
    createJob,
    num = 1,
    count = 10,
  ): Promise<void> {
    const stop = num + count;
    for (let i = num; i <= stop; i++) {
      await createJob(queue, i);
    }
    if (!this.isStopped) {
      const timeout = setTimeout(
        () => this.keepProducingJobs(queue, createJob, ++num),
        15 * 1000,
      );
      timeout.unref();
      this.timeouts.set(queue, timeout);
    }
  }
}