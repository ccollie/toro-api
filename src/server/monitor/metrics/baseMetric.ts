import Emittery from 'emittery';
import pMap from 'p-map';
import { ObjectSchema } from '@hapi/joi';

export class BaseMetric extends Emittery {
  private _cleanupHandlers: any[];
  private _prev: number;
  protected _value: number;

  constructor() {
    super();
    this._cleanupHandlers = [];
    this._prev = null;
    this._value = -1;
  }

  destroy(): any {
    this.clearListeners();
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
    return null;
  }

  static get unit(): string {
    return '';
  }

  get value(): any {
    return this._value;
  }

  onUpdate(listener) {
    return this.on('update', listener);
  }

  // Override in descendents
  baseUpdate(value: number): number {
    return value;
  }

  // Public api used elsewhere
  update(value): number {
    this._value = this.baseUpdate(value);
    if (this._value !== this._prev) {
      this._prev = this._value;
      this.emit('update', this._value).catch((err) => console.log(err));
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
