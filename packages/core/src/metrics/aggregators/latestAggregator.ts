import { ObjectSchema } from 'joi';
import { BaseAggregator } from './aggregator';
import { AggregatorTypes } from '../types';
import { Metric } from '../metric';

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

  getDescription(metric: Metric, short?: boolean): string {
    const metricType = metric.name.name;
    if (short) {
      return metricType;
    }
    return `${metricType} latest value`;
  }

  static get key(): AggregatorTypes {
    return AggregatorTypes.Latest;
  }

  static get description(): string {
    return 'Latest value';
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
  update(value: number, ts?: number): number {
    this._count++;
    return (this._value = value);
  }
}
