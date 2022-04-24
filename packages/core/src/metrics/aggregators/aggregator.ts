import * as boom from '@hapi/boom';
import { ObjectSchema } from 'joi';
import { AggregatorTypes, SerializedAggregator } from '../../types';
import { aggregatorTypeNameMap } from './utils';
import { getStaticProp } from '@alpen/shared';
import { Metric } from '../metric';

export interface Aggregator {
  /** The number of samples added so far */
  count: number;
  /**
   * Gets the result of the aggregation using stored values.
   *
   * @return the result of the aggregation.
   */
  value: number;
  /**
   * Update the states of the aggregator with the current value.
   * @param value
   *            the value to aggregate
   * @param ts the timestamp of when the update occurred
   */
  update(value: number, ts?: number): number;
  /**
   * Reset the states of the aggregator.
   */
  reset(): void;
}

export interface WindowedAggregator extends Aggregator {
  windowSize: number;
}

export class BaseAggregator implements Aggregator {
  protected options: any;

  constructor(options?: any) {
    if (arguments.length) {
      this.setOptions(options);
    } else {
      this.options = {};
    }
  }

  destroy(): void {
    // do not delete
  }

  setOptions(options: unknown): void {
    this.options = BaseAggregator.validateOptions(options);
  }

  static validateOptions(options: unknown): any {
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

  getDescription(metric: Metric, short = false): string {
    const type = metric.name.name;
    if (short) {
      const key = getStaticProp(this, 'key');
      const aggrTypeName = aggregatorTypeNameMap[key as AggregatorTypes];
      return `${aggrTypeName}(${type})`;
    }
    const description = getStaticProp(this, 'description');
    return `${description} ${type}`;
  }

  get type(): AggregatorTypes {
    return (this.constructor as any).key;
  }

  static get key(): AggregatorTypes {
    return AggregatorTypes.None;
  }

  static get description(): string {
    return 'Base aggregator';
  }

  static get schema(): ObjectSchema {
    return null;
  }

  static get isWindowed(): boolean {
    return false;
  }

  toJSON(): SerializedAggregator {
    const type = this.type;
    const options = this.options ? { ...this.options } : {};
    return {
      type,
      options,
    };
  }

  get count(): number {
    throw boom.notImplemented('count property not implemented');
  }

  get value(): number {
    return NaN;
  }

  // to override
  update(value: number, ts?: number): number {
    return value;
  }

  reset(): void {
    // abstract
  }
}
