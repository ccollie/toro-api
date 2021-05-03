import { ObjectSchema } from 'joi';
import { BaseMetric } from '../baseMetric';
import { BaseAggregator } from './aggregator';
import { getStaticProp } from '../../lib';
import { AggregatorTypes } from '../../../types';

/**
 * An aggregator which returns the latest value
 */
export class LatestAggregator extends BaseAggregator {
  protected _value: number | undefined;
  private _count: number;

  constructor() {
    super();
    this._count = 0;
    this._value = undefined;
  }

  getDescription(metric: BaseMetric): string {
    return getStaticProp(metric, 'key');
  }

  static get key(): AggregatorTypes {
    return AggregatorTypes.Latest;
  }

  static get description(): string {
    return 'returns the latest value from a stream of values';
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
