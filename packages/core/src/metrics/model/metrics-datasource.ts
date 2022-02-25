import { notImplemented } from '@hapi/boom';
import Emittery from 'emittery';
import ms from 'ms';
import * as Joi from 'joi';
import { JobEventData } from '../../queues';
import { Events } from '../constants';
import { createAsyncIterator, systemClock } from '../../lib';
import { MetricsListener } from '../metrics-listener';
import { DurationSchema } from '../../validation';
import { MetricCategory, MetricValueType, MetricTypes } from '../types';
import type {
  QueueMetricOptions,
  MetricOptions,
} from '../types';
import { createJobNameFilter, metricNameByEnum } from '../utils';
import { getConfigDuration } from '../../lib/config-utils';
import { getStaticProp } from '@alpen/shared';
import { Predicate } from '../../types';
import { TimeseriesDataPoint } from '../../stats/types';

export interface MetricUpdateEvent {
  ts: number;
  value: number;
  metric: MetricDataSource;
}

export type MetricUpdateEventHandler = (eventData?: MetricUpdateEvent) => void;

const DEFAULT_SAMPLE_INTERVAL = ms('1 min'); // todo: get from config

function getSampleInterval(): number {
  return getConfigDuration('METRIC_SAMPLE_INTERVAL', DEFAULT_SAMPLE_INTERVAL);
}

export const BaseMetricSchema = Joi.object().keys({
  sampleInterval: DurationSchema.optional().default(getSampleInterval()),
});

export const QueueBasedMetricSchema = BaseMetricSchema.append({
  jobNames: Joi.array().items(Joi.string()).single().optional().default([]),
});

export interface SerializeMetricDataSource {
  id?: string;
  type: MetricTypes;
  name?: string;
  options: Record<string, any>;
  lastChangedAt?: number;
}

export interface IMetricDataSource {
  getValue(): number;
}

export interface UpdatableMetricDataSource extends IMetricDataSource {
  update(value: number): void;
}

/**
 * Metrics are numeric samples of data collected over time
 */
export abstract class MetricDataSource {
  private readonly emitter: Emittery = new Emittery();
  private clock = systemClock;
  public id: string;
  public queueId: string;
  public name: string;
  protected options: any;
  private _prev: number;
  protected _value: number;
  public lastChangedAt: number;

  protected constructor(options: unknown) {
    this._prev = null;
    this._value = -1;
    this.setOptions(options);
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

  static getTypeName(metric: MetricDataSource): string {
    const type = getStaticProp(metric, 'key') as MetricTypes;
    return metricNameByEnum[type];
  }

  static get key(): MetricTypes {
    return MetricTypes.None;
  }

  static get description(): string {
    return 'base_description';
  }

  static get schema(): Joi.ObjectSchema {
    return BaseMetricSchema;
  }

  static get unit(): string {
    return 'base_unit';
  }

  static get type(): MetricValueType {
    return MetricValueType.Gauge;
  }

  get value(): number {
    return this._value;
  }

  onUpdate(listener: MetricUpdateEventHandler): Emittery.UnsubscribeFn {
    return this.emitter.on('update', listener);
  }

  offUpdate(listener: MetricUpdateEventHandler): void {
    return this.emitter.off('update', listener);
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  init(listener: MetricsListener): void {
    // abstract method
  }

  toJSON(): SerializeMetricDataSource {
    const type = (this.constructor as any).key;
    const { lastChangedAt } = this;
    return {
      id: this.id,
      lastChangedAt,
      type,
      options: {
        ...this.options,
      },
    };
  }


  // Public core used elsewhere
  update(value: number, ts?: number): number {
    ts = ts ?? this.clock.getTime();
    this._value = value;
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
}

export abstract class QueueBasedMetricDataSource extends MetricDataSource {
  private _filter: Predicate<string>;
  private _jobNames: string[];

  constructor(options: QueueMetricOptions) {
    super(options);
    this.jobNames = options.jobNames || [];
  }

  static get category(): MetricCategory {
    return MetricCategory.Queue;
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
  checkUpdate: (listener?: MetricsListener, ts?: number) => Promise<void>;
}

export function isPollingMetric(arg: any): arg is IPollingMetric {
  return (
    arg &&
    typeof arg.interval === 'number' &&
    typeof arg.checkUpdate === 'function' &&
    arg instanceof MetricDataSource
  );
}

export abstract class PollingMetricDataSource extends MetricDataSource implements IPollingMetric {
  protected constructor(options: MetricOptions) {
    super(options);
  }

  checkUpdate(listener?: MetricsListener, ts?: number): Promise<void> {
    throw notImplemented('checkUpdate');
  }
}

export abstract class QueuePollingMetricDataSource
  extends QueueBasedMetricDataSource
  implements IPollingMetric
{
  protected constructor(options: QueueMetricOptions) {
    super(options);
  }

  checkUpdate(): Promise<void> {
    throw notImplemented('checkUpdate');
  }

  static get schema(): Joi.ObjectSchema {
    return QueueBasedMetricSchema;
  }
}
