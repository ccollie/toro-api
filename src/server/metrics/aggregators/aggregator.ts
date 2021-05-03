import boom from '@hapi/boom';
import { isEqual } from 'lodash';
import { EventEmitter } from 'events';
import { ObjectSchema } from 'joi';
import { Clock, getStaticProp, systemClock } from '../../lib';
import { BaseMetric } from '../baseMetric';
import { AggregatorTypes, SerializedAggregator } from '../../../types';

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
   */
  update(value: number): number;
  /**
   * Reset the states of the aggregator.
   */
  reset(): void;
}

export class BaseAggregator extends EventEmitter implements Aggregator {
  protected clock: Clock;
  protected options: any;

  constructor(clock?: Clock, options?: any) {
    super();
    this.clock = clock || systemClock;
    if (arguments.length > 1) {
      this.setOptions(options);
    } else {
      this.options = {};
    }
  }

  destroy(): void {
    // do not delete
  }

  setOptions(options: any) {
    this.options = BaseAggregator.validateOptions(options);
  }

  isSameAs(other: BaseAggregator): boolean {
    return (
      other && other.type === this.type && isEqual(other.options, this.options)
    );
  }

  static validateOptions(options: any): any {
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

  getDescription(metric: BaseMetric, short = false): string {
    const type = getStaticProp(metric, 'type');
    if (short) {
      const key = getStaticProp(this, 'key');
      return `${key}(${type})`;
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
  update(value: number): number {
    return value;
  }

  reset(): void {
    // abstract
  }
}
