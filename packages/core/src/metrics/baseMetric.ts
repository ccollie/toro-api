import Emittery from 'emittery';
import * as Joi from 'joi';
import { JobEventData } from '../queues';
import { Events } from './types';
import { createAsyncIterator, systemClock } from '../lib';
import type {
  SerializedMetric,
  QueueMetricOptions,
  MetricOptions,
  Predicate,
} from '../types';
import { createJobNameFilter } from './utils';
import type { TimeseriesDataPoint } from '../stats';
import { Queue } from 'bullmq';
import { Pipeline } from 'ioredis';
import { getMetricsDataKey } from '../keys';
import {MetricName, MetricType} from './crow/metric-name';

export interface MetricUpdateEvent {
  ts: number;
  value: number;
  metric: BaseMetric;
}

export type MetricUpdateEventHandler = (eventData?: MetricUpdateEvent) => void;

export const BaseMetricSchema = Joi.object().keys({
  jobNames: Joi.array().items(Joi.string()).single().optional().default([]),
});

export const QueueBasedMetricSchema = BaseMetricSchema;

/**
 * Metrics are numeric samples of data collected over time
 */
export abstract class BaseMetric {
  private readonly emitter: Emittery = new Emittery();
  public id: string;
  public queueId: string;
  protected options: any;
  private _prev: number;
  protected _value: number;
  protected _mn: MetricName;
  public isActive = true;
  public createdAt: number;
  public updatedAt: number;
  public lastChangedAt: number;

  protected constructor(options: unknown) {
    this._prev = null;
    this._value = -1;
    this.setOptions(options);
    this.createdAt = systemClock.getTime();
    this.updatedAt = this.createdAt;
  }

  get canonicalName() {
    return this._mn.canonical;
  }

  validateOptions<T = any>(options: unknown): T {
    const schema = (this.constructor as any).schema;
    if (schema) {
      const { error, value } = schema.validate(options);
      if (error) {
        throw error;
      }
      return value as T;
    }

    return options as T;
  }

  setOptions(options: unknown): void {
    this.options = this.validateOptions(options);
  }

  destroy(): void {
    this.emitter.clearListeners();
  }

  static get schema(): Joi.ObjectSchema {
    return BaseMetricSchema;
  }

  get type(): MetricType {
    return this._mn.type;
  }

  get value(): number {
    return this._value;
  }

  onUpdate(listener: MetricUpdateEventHandler): Emittery.UnsubscribeFn {
    return this.emitter.on('update', listener);
  }

  createValueIterator(): AsyncIterator<TimeseriesDataPoint> {
    return createAsyncIterator(this.emitter, {
      eventNames: ['update'],
      transform(_, data: MetricUpdateEvent) {
        return {
          ts: data.ts,
          value: data.value,
        };
      },
    });
  }

  toJSON(): SerializedMetric {
    const { createdAt, updatedAt, isActive } = this;
    return {
      id: this.id,
      name: this._mn.toJSON(),
      isActive,
      options: {
        ...this.options,
      },
      createdAt,
      updatedAt,
    };
  }

  // To override in descendents
  protected transformValue(value: number, ts?: number): number {
    return value;
  }

  // Public core used elsewhere
  update(value: number, ts?: number): number {
    ts = ts ?? systemClock.getTime();
    this._value = this.transformValue(value, ts);
    if (this._value !== this._prev) {
      this._prev = this._value;
      this.lastChangedAt = ts;
      const event: MetricUpdateEvent = {
        ts,
        value: this._value,
        metric: this,
      };
      this.emitter.emit('update', event).catch((err) => console.log(err));
    }
    return this._value;
  }

  protected getDataKey(queue: Queue): string {
    return getMetricsDataKey(queue, this.id);
  }
}

export abstract class QueueBasedMetric extends BaseMetric {
  private _filter: Predicate<string>;
  private _jobNames: string[];

  constructor(options: QueueMetricOptions) {
    super(options);
    this.jobNames = options.jobNames || [];
  }

  get validEvents(): string[] {
    return [Events.FINISHED];
  }

  get jobNames(): string[] {
    return this._jobNames;
  }

  set jobNames(values: string[]) {
    this._jobNames = values;
    this._filter = createJobNameFilter(values);
  }

  static get schema(): Joi.ObjectSchema {
    return QueueBasedMetricSchema;
  }

  abstract handleEvent(event?: JobEventData): void;

  accept(event: JobEventData): boolean {
    const name = event.job.name;
    return !name || this._filter(name);
  }
}

export interface IPollingMetric {
  checkUpdate: (pipeline: Pipeline, queue: Queue, ts?: number) => Promise<void>;
}

export function isPollingMetric(arg: any): arg is IPollingMetric {
  return (
    arg &&
    typeof arg.interval === 'number' &&
    typeof arg.checkUpdate === 'function' &&
    arg instanceof BaseMetric
  );
}

export abstract class PollingMetric
  extends BaseMetric
  implements IPollingMetric
{
  protected constructor(options: MetricOptions) {
    super(options);
  }

  abstract checkUpdate(
    pipeline: Pipeline,
    queue: Queue,
    ts?: number,
  ): Promise<void>;
}

export abstract class QueuePollingMetric extends QueueBasedMetric {
  protected constructor(options: QueueMetricOptions) {
    super(options);
  }

  static get schema(): Joi.ObjectSchema {
    return QueueBasedMetricSchema;
  }
}
