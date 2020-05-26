import boom from '@hapi/boom';
import { EventEmitter } from 'events';
import slidingWindowSchema from './slidingWindowBaseSchema';
import { ObjectSchema } from '@hapi/joi';

export class BaseAggregator extends EventEmitter {
  constructor() {
    super();
  }

  destroy() {
    // do not delete
  }

  static get key() {
    return 'base_aggregator';
  }

  static get description(): string {
    return 'Base aggregator';
  }

  static get schema(): ObjectSchema {
    return null;
  }

  get value(): number {
    return Number.NEGATIVE_INFINITY;
  }

  // to override
  update(value) {
    return value;
  }
}

export class NullAggregator extends EventEmitter {
  protected _value;

  constructor(props) {
    super(props);
    this._value = undefined;
  }

  static get key(): string {
    return 'null_aggregator';
  }

  static get description(): string {
    return 'Null aggregator';
  }

  static get schema(): ObjectSchema {
    return null;
  }

  get value(): number {
    return this._value;
  }

  // to override
  update(value) {
    this._value = value;
    return value;
  }
}

export class SlidingWindowAggregator extends BaseAggregator {
  static get key(): string {
    return 'base_window_aggregator';
  }

  static get description(): string {
    return 'Sliding Window Aggregator';
  }

  get duration(): number {
    return 300000;
  }

  get period(): number {
    return 500;
  }

  onTick(handler) {
    throw boom.notImplemented('onTick not implemented');
  }

  static get schema(): ObjectSchema {
    return slidingWindowSchema;
  }
}
