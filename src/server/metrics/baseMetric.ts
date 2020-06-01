import boom from '@hapi/boom';
import Emittery, { UnsubscribeFn } from 'emittery';
import crypto from 'crypto';
import Joi, { ObjectSchema } from 'joi';
import { JobEventData } from '../queues';
import { createJobNameFilter } from './lib/utils';
import { BaseAggregator, NullAggregator } from './aggregators';
import { Events } from './constants';
import {
  systemClock,
  Clock,
  AsyncIterationBuffer,
  createAsyncIterator,
} from '../lib';
import { MetricsListener } from './metricsListener';
import { DurationSchema } from '../validation/schemas';
import { MetricType, Predicate } from '../../types';

export enum MetricCategory {
  Redis = 'redis',
  Queue = 'queue',
  Host = 'host',
}

export interface MetricOptions {
  id?: string;
  name?: string;
  jobNames?: string[];
}

export interface MetricUpdateEvent {
  ts: number;
  value: number;
  metric: BaseMetric;
}

export type MetricUpdateEventHandler = (eventData?: MetricUpdateEvent) => void;

export const baseMetricSchema = Joi.object().keys({
  id: Joi.string()
    .regex(/^[a-zA-Z0-9_\-!@#$]{3,25}$/)
    .optional(),
  jobNames: Joi.array().items(Joi.string()).single().optional().default([]),
  name: Joi.string().optional(),
});

export class BaseMetric {
  public readonly id: string;
  public queueId: string;
  public name: string;
  public readonly jobNames: string[];
  private readonly emitter: Emittery = new Emittery();
  private readonly _filter: Predicate<string>;
  private _aggregator: BaseAggregator;
  protected readonly options: MetricOptions;
  private _prev: number;
  protected _value: number;
  public lastChangedAt: number;
  public clock: Clock = systemClock;

  constructor(options: MetricOptions) {
    this._prev = null;
    this._value = -1;
    this.options = this.validateOptions(options);
    this.jobNames = options.jobNames || [];
    this._filter = createJobNameFilter(this.jobNames);
    this._aggregator = new NullAggregator();
    if (options.id) {
      this.id = options.id;
    } else {
      const key = (this.constructor as any).key;
      this.id = key + '-' + crypto.randomBytes(6).toString('hex');
    }
    if (options.name) {
      this.name = options.name;
    }
  }

  get aggregator(): BaseAggregator {
    this._aggregator = this._aggregator || new NullAggregator();
    return this._aggregator;
  }

  set aggregator(value: BaseAggregator) {
    if (this._aggregator) {
      this._aggregator.destroy();
    }
    this._aggregator = value;
  }

  protected validateOptions(options: MetricOptions): MetricOptions {
    const schema = (this.constructor as any).schema;
    if (schema) {
      const { error, value } = schema.validate(options);
      if (error) {
        throw error;
      }
      return value;
    }

    return options;
  }

  get validEvents(): string[] {
    return [Events.FINISHED];
  }

  destroy(): any {
    if (this._aggregator) {
      this._aggregator.destroy();
    }
    this.emitter.clearListeners();
  }

  static get key(): string {
    return 'base_metric';
  }

  static get description(): string {
    return 'base_description';
  }

  static get category(): MetricCategory {
    return MetricCategory.Queue;
  }

  static get schema(): ObjectSchema {
    return baseMetricSchema;
  }

  static get unit(): string {
    return 'base_unit';
  }

  static get type(): MetricType {
    return MetricType.Gauge;
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

  createValueIterator(): AsyncIterator<number> {
    return createAsyncIterator(this.emitter, {
      eventNames: ['update'],
      transform(_, data: MetricUpdateEvent) {
        return data.value;
      },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  init(listener: MetricsListener): void {
    this.clock = listener.clock;
    // abstract method
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  handleEvent(event?: JobEventData): void {
    // to override in subclasses
  }

  accept(event: JobEventData): boolean {
    const name = event.job.name;
    return !name || this._filter(name);
  }

  toJSON(): Record<string, any> {
    const type = (this.constructor as any).key;
    const aggregator = this._aggregator.toJSON();
    return {
      type,
      options: {
        ...this.options,
        id: this.id,
      },
      aggregator,
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

export interface PollingMetricOptions extends MetricOptions {
  interval: number;
}

export const pollingMetricSchema = baseMetricSchema.append({
  interval: DurationSchema.required(),
});

export class PollingMetric extends BaseMetric {
  constructor(options: PollingMetricOptions) {
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
