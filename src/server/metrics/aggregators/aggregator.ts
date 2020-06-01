import boom from '@hapi/boom';
import { EventEmitter } from 'events';
import { ObjectSchema } from 'joi';
import { Clock, getStaticProp, systemClock } from '../../lib';
import { BaseMetric } from '../baseMetric';

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

  constructor(clock?: Clock) {
    super();
    this.clock = clock || systemClock;
  }

  destroy(): void {
    // do not delete
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

  static get key(): string {
    return 'base_aggregator';
  }

  static get description(): string {
    return 'Base aggregator';
  }

  static get schema(): ObjectSchema {
    return null;
  }

  toJSON(): Record<string, any> {
    const type = (this.constructor as any).key;
    return { type, options: {} };
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
