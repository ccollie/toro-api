import { MetricsListener, BaseMetric } from '../../../src/server/metrics';
import { QueueListenerHelper, createQueueListener } from '../../factories';
import { QueueListener } from '../../../src/server/queues';
import { UnsubscribeFn } from 'emittery';
import { Queue } from 'bullmq';
import { Clock } from '../../../src/server/lib';
import * as IORedis from 'ioredis';

function getStaticProp(obj: object, name: string): any {
  return (obj.constructor as any)[name];
}

function getDefaultProp(name: string): string {
  const metric = new BaseMetric({});
  const value = getStaticProp(metric, name);
  metric.destroy();
  return value;
}

let baseKey: string;
let baseDescription: string;
let baseUnit: string;

function getBaseKey(): string {
  return baseKey || (baseKey = getDefaultProp('key'));
}

function getBaseDescription(): string {
  return baseDescription || (baseDescription = getDefaultProp('description'));
}

function getBaseUnit(): string {
  return baseUnit || (baseUnit = getDefaultProp('unit'));
}

export class MetricTestHelper {
  readonly queueListener: QueueListener;
  private readonly queueListenerHelper: QueueListenerHelper;
  readonly metricsListener: MetricsListener;
  private readonly _disposeQueue: boolean;

  constructor(queue?: Queue) {
    this.queueListener = createQueueListener(queue);
    this.queueListenerHelper = new QueueListenerHelper(this.queueListener);
    this.metricsListener = new MetricsListener(this.queueListener);
    this._disposeQueue = !queue;
  }

  static forMetric(metric: BaseMetric, queue?: Queue): MetricTestHelper {
    const helper = new MetricTestHelper(queue);
    helper.registerMetric(metric);
    return helper;
  }

  static getStaticProp(metric: BaseMetric, name: string): any {
    return (metric.constructor as any)[name];
  }

  static getKey(metric: BaseMetric): string {
    return this.getStaticProp(metric, 'key');
  }

  static hasKey(metric: BaseMetric): boolean {
    const key = this.getStaticProp(metric, 'key');
    return key && key !== getBaseKey();
  }

  static getUnit(metric: BaseMetric): string {
    return this.getStaticProp(metric, 'unit');
  }

  static hasUnit(metric: BaseMetric): boolean {
    const unit = this.getStaticProp(metric, 'unit');
    return unit && unit !== getBaseUnit();
  }

  static hasDescription(metric: BaseMetric): boolean {
    const descr = this.getStaticProp(metric, 'description');
    return descr && descr !== getBaseDescription();
  }

  async destroy(): Promise<void> {
    const queue = this.queue;
    await this.queueListener.destroy();
    this.metricsListener.destroy();
    if (this._disposeQueue) {
      await queue.close();
    }
  }

  get queue(): Queue {
    return this.queueListener.queue;
  }

  get clock(): Clock {
    return this.metricsListener.clock;
  }

  get client(): Promise<IORedis.Redis> {
    return this.queue.client;
  }

  registerMetric(metric: BaseMetric) {
    this.metricsListener.registerMetric(metric);
  }

  unregisterMetric(metric: BaseMetric): void {
    this.metricsListener.unregisterMetric(metric);
  }

  advanceTime(delta: number): void {
    this.queueListenerHelper.advanceTime(delta);
  }

  async emitJobEvent(event: string, data?: Record<string, any>): Promise<void> {
    return this.queueListenerHelper.postJobEvent(event, data);
  }

  async emitCompletedEvent(data?: Record<string, any>): Promise<void> {
    return this.queueListenerHelper.postCompletedEvent(data);
  }

  async emitFailedEvent(data?: Record<string, any>): Promise<void> {
    return this.queueListenerHelper.postFailedEvent(data);
  }

  async emitFinishedEvent(
    success: boolean,
    data?: Record<string, any>,
  ): Promise<void> {
    return this.queueListenerHelper.postFinishedEvent(success, data);
  }

  onMetricUpdate(handler: (eventData?: any) => void): UnsubscribeFn {
    return this.metricsListener.onMetricsUpdated(handler);
  }
}
