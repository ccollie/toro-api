import Emittery from 'emittery';
import pMap from 'p-map';
import { ObjectSchema } from '@hapi/joi';
import { SlidingWindowOptions } from '../lib';
import { JobFinishedEventData, QueueListener } from '../queues';
import { createJobNameFilter } from '../lib/utils';
import { Predicate } from '@src/types';
import Joi from '@hapi/joi';
import { durationSchema } from '../validation/joi';

export interface MetricOptions {
  window: SlidingWindowOptions;
  jobNames?: string[];
}

const slidingWindowSchema = Joi.object().keys({
  duration: durationSchema,
  period: Joi.number().integer().positive().default(750), // todo: get default from config
});

const schema = Joi.object().keys({
  window: slidingWindowSchema.optional(),
  jobNames: Joi.array().items(Joi.string()).single(),
});

const hasJobNamePayload = (eventName: string) =>
  ['job.completed', 'job.failed', 'job.finished'].includes(eventName);

export class BaseMetric {
  private readonly queueListener: QueueListener;
  private readonly emitter: Emittery = new Emittery();
  private readonly _filter: Predicate<string>;
  protected readonly options: MetricOptions;
  private _cleanupHandlers: any[];
  private _prev: number;
  protected _value: number;

  constructor(queueListener: QueueListener, options: MetricOptions) {
    this._cleanupHandlers = [];
    this._prev = null;
    this._value = -1;
    this.options = this.validateOptions(options);
    this.queueListener = queueListener;
    this._filter = createJobNameFilter(options.jobNames);
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

  destroy(): any {
    this.emitter.clearListeners();
    return pMap(this._cleanupHandlers, (fn) => fn()).catch((err) => {
      console.log(err);
    });
  }

  onDestroy(...handlers): void {
    this._cleanupHandlers.push(...handlers);
  }

  static get key(): string {
    return 'base_metric';
  }

  static get description(): string {
    return 'base_description';
  }

  static get schema(): ObjectSchema {
    return schema;
  }

  static get unit(): string {
    return '';
  }

  get value(): any {
    return this._value;
  }

  onUpdate(listener) {
    return this.emitter.on('update', listener);
  }

  protected subscribe(eventName: string, handler): void {
    let unsubFn;
    const shouldFilter = this.options.jobNames && this.options.jobNames.length;

    if (hasJobNamePayload(eventName) && shouldFilter) {
      const wrapper = (event: JobFinishedEventData) => {
        const name = event.job.name;
        if (this._filter(name)) {
          return handler(event);
        }
      };
      unsubFn = this.queueListener.on(eventName, wrapper);
    } else {
      unsubFn = this.queueListener.on(eventName, handler);
    }
    this.onDestroy(unsubFn);
  }

  // Override in descendents
  protected baseValue(value: number): number {
    return value;
  }

  // Public api used elsewhere
  update(value: number): number {
    this._value = this.baseValue(value);
    if (this._value !== this._prev) {
      this._prev = this._value;
      this.emitter.emit('update', this._value).catch((err) => console.log(err));
    }
    return this._value;
  }
}

export interface MetricConstructor<T extends BaseMetric> {
  create(...args): T;
}

const metricCreatorMap = new Map();

export function registerMetric<T extends BaseMetric>(
  type: T,
  ctor: MetricConstructor<T>,
): void {
  const name = type.constructor.name;
  metricCreatorMap.set(name, ctor);
}
