import boom from '@hapi/boom';
import Emittery from 'emittery';
import ms from 'ms';
import crypto from 'crypto';
import Joi, { ObjectSchema } from 'joi';
import { JobEventData } from '../queues';
import { BaseAggregator, NullAggregator } from './aggregators';
import { Events } from './constants';
import { Clock, createAsyncIterator, systemClock } from '../lib';
import { MetricsListener } from './metrics-listener';
import { DurationSchema } from '../validation/schemas';
import {
  MetricCategory,
  MetricValueType,
  MetricTypes,
  PollingMetricOptions,
  Predicate,
  SerializedMetric,
  TimeseriesDataPoint,
  QueueMetricOptions,
  QueuePollingMetricOptions,
} from '../../types';
import { createJobNameFilter } from './utils';
import { parseDuration } from '../lib/datetime';

export interface MetricUpdateEvent {
  ts: number;
  value: number;
  metric: BaseMetric;
}

export type MetricUpdateEventHandler = (eventData?: MetricUpdateEvent) => void;

const DEFAULT_SAMPLE_INTERVAL = ms('1 min'); // todo: get from config

function getSampleInterval(): number {
  const baseValue = process.env.METRIC_SAVE_INTERVAL;
  return baseValue
    ? parseDuration(baseValue, DEFAULT_SAMPLE_INTERVAL)
    : DEFAULT_SAMPLE_INTERVAL;
}

export const BaseMetricSchema = Joi.object().keys({
  sampleInterval: DurationSchema.optional().default(getSampleInterval()),
});

export const QueueBasedMetricSchema = BaseMetricSchema.append({
  jobNames: Joi.array().items(Joi.string()).single().optional().default([]),
});

/**
 * Metrics are numeric samples of data collected over time
 */
export abstract class BaseMetric {
  private readonly emitter: Emittery = new Emittery();
  public readonly id: string;
  public queueId: string;
  public name: string;
  public description: string;
  protected options: any;
  private _aggregator: BaseAggregator;
  private _prev: number;
  protected _value: number;
  protected _sampleInterval?: number;
  public isActive = true;
  public createdAt: number;
  public updatedAt: number;
  public lastChangedAt: number;
  public clock: Clock = systemClock;

  protected constructor(options: any) {
    this._prev = null;
    this._value = -1;
    this._sampleInterval = getSampleInterval();
    this.setOptions(options);
    this._aggregator = new NullAggregator();
    const key = (this.constructor as any).key;
    this.id = key.toLowerCase() + '-' + crypto.randomBytes(6).toString('hex');
    this.createdAt = this.clock.getTime();
    this.updatedAt = this.createdAt;
  }

  get aggregator(): BaseAggregator {
    this._aggregator = this._aggregator || new NullAggregator();
    return this._aggregator;
  }

  set aggregator(value: BaseAggregator) {
    if (this._aggregator) {
      this._aggregator.destroy();
    }
    // todo: validate by schema
    this._aggregator = value;
  }

  validateOptions<T = any>(options: any): T {
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

  setOptions(options: any): void {
    this.options = this.validateOptions(options);
  }

  destroy(): void {
    if (this._aggregator) {
      this._aggregator.destroy();
    }
    this.emitter.clearListeners();
  }

  get sampleInterval(): number {
    return this._sampleInterval;
  }

  set sampleInterval(value: number | string) {
    let newValue: number;

    if (typeof value === 'string') {
      newValue = ms(value);
      if (isNaN(newValue)) {
        throw boom.badData('Invalid value for "sampleInterval"');
      }
    } else {
      newValue = value;
    }
    // todo: set lower bound
    this._sampleInterval = newValue;
  }

  static get key(): MetricTypes {
    return MetricTypes.None;
  }

  static get description(): string {
    return 'base_description';
  }

  static get category(): MetricCategory {
    return MetricCategory.Queue;
  }

  static get schema(): ObjectSchema {
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
    this.clock = listener.clock;
    // abstract method
  }

  toJSON(): SerializedMetric {
    const type = (this.constructor as any).key;
    const aggregator = this._aggregator.toJSON();
    const { createdAt, updatedAt, isActive } = this;
    return {
      id: this.id,
      name: this.name,
      isActive,
      type,
      description: this.description,
      options: {
        ...this.options,
      },
      aggregator,
      createdAt,
      updatedAt,
    };
  }

  // To override in descendents
  protected transformValue(value: number): number {
    return this._aggregator.update(value);
  }

  // Public api used elsewhere
  update(value: number): number {
    this._value = this.transformValue(value);
    if (this._value !== this._prev) {
      this._prev = this._value;
      this.lastChangedAt = this.clock.getTime();
      const event: MetricUpdateEvent = {
        ts: this.lastChangedAt,
        value: this._value,
        metric: this,
      };
      this.emitter.emit('update', event).catch((err) => console.log(err));
    }
    return this._value;
  }
}

export abstract class QueueBasedMetric extends BaseMetric {
  private _filter: Predicate<string>;
  private _jobNames: string[] = [];

  constructor(options: QueueMetricOptions) {
    super(options);
  }

  static get category(): MetricCategory {
    return MetricCategory.Queue;
  }

  setOptions(options: QueueMetricOptions): void {
    this.options = this.validateOptions(options);
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

  static get schema(): ObjectSchema {
    return QueueBasedMetricSchema;
  }

  abstract handleEvent(event?: JobEventData): void;

  accept(event: JobEventData): boolean {
    const name = event.job.name;
    return !name || this._filter(name);
  }
}

export const pollingMetricSchema = BaseMetricSchema.append({
  interval: DurationSchema.required(),
});

export interface IPollingMetric {
  interval: number;
  checkUpdate: () => Promise<void>;
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
  protected constructor(options: PollingMetricOptions) {
    super(options);
  }

  get interval(): number {
    return (this.options as PollingMetricOptions).interval;
  }

  checkUpdate(): Promise<void> {
    throw boom.notImplemented('checkUpdate');
  }

  static get schema(): ObjectSchema {
    return pollingMetricSchema;
  }
}

export abstract class QueuePollingMetric
  extends QueueBasedMetric
  implements IPollingMetric
{
  protected constructor(options: QueuePollingMetricOptions) {
    super(options);
  }

  get interval(): number {
    return (this.options as PollingMetricOptions).interval;
  }

  checkUpdate(): Promise<void> {
    throw boom.notImplemented('checkUpdate');
  }

  static get schema(): ObjectSchema {
    return pollingMetricSchema;
  }
}
