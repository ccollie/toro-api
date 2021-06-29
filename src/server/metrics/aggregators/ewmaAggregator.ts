import { BaseAggregator, WindowedAggregator } from './aggregator';
import { Clock, getStaticProp } from '../../lib';
import { BaseMetric } from '../baseMetric';
import { IMovingAverage, MovingAverage } from '../../stats/moving-average';
import { ObjectSchema } from 'joi';
import { AggregatorTypes, SlidingWindowOptions } from '@src/types';
import { SlidingWindowOptionSchema } from './slidingTimeWindowAggregator';

/***
 * Returns the Exponentially Weighted Moving Avg of a stream
 * of values
 */
export class EWMAAggregator
  extends BaseAggregator
  implements WindowedAggregator
{
  private readonly ewma: IMovingAverage;
  private _count = 0;
  public readonly windowSize: number;

  /**
   * Construct a EWMAAggregator
   */
  constructor(clock: Clock, options: SlidingWindowOptions) {
    super(clock, options);
    this.windowSize = options.duration;
    this.ewma = MovingAverage(options.duration);
  }

  getDescription(metric: BaseMetric, short = false): string {
    const type = getStaticProp(metric, 'key');
    if (short) {
      return super.getDescription(metric, true);
    }
    return `${type} EWMA`;
  }

  static get key(): AggregatorTypes {
    return AggregatorTypes.Ewma;
  }

  static get description(): string {
    return 'EWMA';
  }

  get count(): number {
    return this._count;
  }

  get value(): number {
    return this.ewma.value;
  }

  update(newVal: number): number {
    this.ewma.update(this.clock.getTime(), newVal);
    this._count++;
    return this.value;
  }

  reset(): void {
    this._count = 0;
    this.ewma.reset();
  }

  static get schema(): ObjectSchema {
    return SlidingWindowOptionSchema;
  }
}
