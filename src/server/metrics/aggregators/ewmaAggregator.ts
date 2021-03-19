import { BaseAggregator } from './aggregator';
import { Clock, getStaticProp } from '../../lib';
import { BaseMetric } from '../baseMetric';
import { IMovingAverage, MovingAverage } from '../../stats/moving-average';

/***
 * Returns the Exponentially Weighted Moving Avg of a stream
 * of values
 */
export class EWMAAggregator extends BaseAggregator {
  private readonly ewma: IMovingAverage;

  /**
   * Construct a EWMAAggregator
   */
  constructor(clock: Clock, interval: number) {
    super(clock);
    this.ewma = MovingAverage(interval, clock);
  }

  getDescription(metric: BaseMetric, short = false): string {
    const type = getStaticProp(metric, 'key');
    if (short) {
      return super.getDescription(metric, true);
    }
    return `${type} EWMA`;
  }

  static get key(): string {
    return 'ewma';
  }

  static get description(): string {
    return 'EWMA';
  }

  get count(): number {
    return this.ewma.count;
  }

  get value(): number {
    return this.ewma.value; // should we divide this by 1 minute ??
  }

  update(newVal: number): number {
    this.ewma.update(newVal);
    return this.value;
  }

  reset(): void {
    this.ewma.reset();
  }
}

const ONE_MINUTE = 1000 * 60;

export class EWMA1MinAggregator extends EWMAAggregator {
  constructor(clock: Clock) {
    super(clock, ONE_MINUTE);
  }

  static get key(): string {
    return 'ewma1min';
  }

  static get description(): string {
    return '1 min EWMA';
  }
}

export class EWMA5MinAggregator extends EWMAAggregator {
  constructor(clock: Clock) {
    super(clock, 5 * ONE_MINUTE);
  }

  static get key(): string {
    return 'ewma5min';
  }

  static get description(): string {
    return '5 min EWMA';
  }
}

export class EWMA15MinAggregator extends EWMAAggregator {
  constructor(clock: Clock) {
    super(clock, 15 * ONE_MINUTE);
  }

  static get key(): string {
    return 'ewma15min';
  }

  static get description(): string {
    return '15 min EWMA';
  }
}
