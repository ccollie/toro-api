import { EventEmitter } from 'events';
import { ObjectSchema } from '@hapi/joi';

export class BaseAggregator extends EventEmitter {
  constructor() {
    super();
  }

  destroy(): void {
    // do not delete
  }

  static get key(): string {
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
  update(value): number {
    return value;
  }
}

export class NullAggregator extends BaseAggregator {
  protected _value;

  constructor() {
    super();
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
  update(value): number {
    this._value = value;
    return value;
  }
}
