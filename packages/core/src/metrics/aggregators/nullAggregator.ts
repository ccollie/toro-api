import { ObjectSchema } from 'joi';
import { BaseAggregator } from './aggregator';
import { AggregatorTypes } from '../../types';
import { getMetricTypeName } from './utils';

export class NullAggregator extends BaseAggregator {
  protected _value: number | undefined;
  private _count: number;

  constructor() {
    super();
    this._count = 0;
    this._value = undefined;
  }

  getDescription(metric: unknown): string {
    return getMetricTypeName(metric);
  }

  static get key(): AggregatorTypes {
    return AggregatorTypes.Identity;
  }

  static get description(): string {
    return 'none';
  }

  static get schema(): ObjectSchema {
    return null;
  }

  get count(): number {
    return this._count;
  }

  get value(): number {
    return this._value;
  }

  // to override
  update(value: number): number {
    this._value = value;
    this._count++;
    return value;
  }
}
