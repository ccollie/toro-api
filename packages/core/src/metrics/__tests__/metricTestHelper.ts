import { Queue, RedisClient } from 'bullmq';
import { UnsubscribeFn } from 'emittery';
import { Clock } from '../../lib';
import { Metric, MetricsListener } from '../../metrics';
import { MetricTypes } from '../../types';
import { QueueListener } from '../../queues';
import { createQueue, createQueueListener, QueueListenerHelper } from '../../__tests__/factories';

const BASE_UNIT = 'base_unit';
const BASE_DESCRIPTION = 'base_description';

function getBaseKey(): MetricTypes {
  return MetricTypes.None;
}

export class MetricTestHelper {
  queueListener: QueueListener;
  metricsListener: MetricsListener;
  private _queue: Queue;
  private queueListenerHelper: QueueListenerHelper;
  private isReady: Promise<Queue>;
  private readonly _disposeQueue: boolean;

  constructor(queue?: Queue) {
    this._disposeQueue = !queue;
    this.isReady = queue ? Promise.resolve(queue) : createQueue();
    this.isReady.then(queue => {
      this._queue = queue;
      this.queueListener = createQueueListener(queue);
      this.queueListenerHelper = new QueueListenerHelper(this.queueListener);
      this.metricsListener = new MetricsListener(this.queueListener);
    });
  }

  waitUntilReady(): Promise<any> {
    return this.isReady;
  }

  static async forMetric(metric: Metric, queue?: Queue): Promise<MetricTestHelper> {
    const helper = new MetricTestHelper(queue);
    await helper.waitUntilReady();
    helper.registerMetric(metric);
    return helper;
  }

  static getStaticProp(metric: Metric, name: string): any {
    return (metric.constructor as any)[name];
  }

  static getKey(metric: Metric): string {
    return this.getStaticProp(metric, 'key');
  }

  static hasKey(metric: Metric): boolean {
    const key = this.getStaticProp(metric, 'key');
    return key && key !== getBaseKey();
  }

  static getUnit(metric: Metric): string {
    return this.getStaticProp(metric, 'unit');
  }

  static hasUnit(metric: Metric): boolean {
    const unit = this.getStaticProp(metric, 'unit');
    return unit && unit !== BASE_UNIT;
  }

  static hasDescription(metric: Metric): boolean {
    const descr = this.getStaticProp(metric, 'description');
    return descr && descr !== BASE_DESCRIPTION;
  }

  async destroy(): Promise<void> {
    const queue = this.queue;
    if (this.queueListener) {
      await this.queueListener.destroy();
    }
    if (this.metricsListener) {
      this.metricsListener.destroy();
    }
    if (queue && this._disposeQueue) {
      await queue.close();
    }
  }

  get queue(): Queue {
    return this._queue;
  }

  get clock(): Clock {
    return this.metricsListener.clock;
  }

  get client(): Promise<RedisClient> {
    return this.isReady.then(q => q.client);
  }

  registerMetric(metric: Metric): void {
   // this.metricsListener.registerMetric(metric);
  }

  unregisterMetric(metric: Metric): void {
    // this.metricsListener.unregisterMetric(metric);
  }

  advanceTime(delta: number): void {
    this.queueListenerHelper.advanceTime(delta);
  }

  async emitJobEvent(event: string, data?: Record<string, any>): Promise<void> {
    await this.waitUntilReady();
    return this.queueListenerHelper.postJobEvent(event, data);
  }

  async emitCompletedEvent(data?: Record<string, any>): Promise<void> {
    await this.waitUntilReady();
    return this.queueListenerHelper.postCompletedEvent(data);
  }

  async emitFailedEvent(data?: Record<string, any>): Promise<void> {
    await this.waitUntilReady();
    return this.queueListenerHelper.postFailedEvent(data);
  }

  async emitFinishedEvent(
    success: boolean,
    data?: Record<string, any>,
  ): Promise<void> {
    await this.waitUntilReady();
    return this.queueListenerHelper.postFinishedEvent(success, data);
  }

  onMetricUpdate(handler: (eventData?: any) => void): UnsubscribeFn {
    return this.metricsListener.onMetricsUpdated(handler);
  }
}
