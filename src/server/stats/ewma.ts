import { IntervalMillis, TimeUnit } from '@server/stats/units';

const SECONDS_PER_MINUTE = 60;
const INTERVAL = 5; // seconds
const MILLIS_PER_SECOND = 1000;
const MILLIS_PER_MINUTE = MILLIS_PER_SECOND * SECONDS_PER_MINUTE;

export function calcAlpha(period: number, interval = INTERVAL): number {
  const minutes = period / MILLIS_PER_MINUTE;
  return 1 - Math.exp(-interval / SECONDS_PER_MINUTE / minutes);
}

/**
 * An exponentially-weighted moving average.
 *
 * @see <a href="http://www.teamquest.com/pdfs/whitepaper/ldavg1.pdf">UNIX Load Average Part 1: How
 *      It Works</a>
 * @see <a href="http://www.teamquest.com/pdfs/whitepaper/ldavg2.pdf">UNIX Load Average Part 2: Not
 *      Your Average Average</a>
 * @see <a href="http://en.wikipedia.org/wiki/Moving_average#Exponential_moving_average">EMA</a>
 */
export class EWMA {
  private static ONE_MINUTE = 1;
  private static FIVE_MINUTES = 5;
  private static FIFTEEN_MINUTES = 15;
  private static M1_ALPHA =
    1 - Math.exp(-INTERVAL / SECONDS_PER_MINUTE / EWMA.ONE_MINUTE);
  private static M5_ALPHA =
    1 - Math.exp(-INTERVAL / SECONDS_PER_MINUTE / EWMA.FIVE_MINUTES);
  private static M15_ALPHA =
    1 - Math.exp(-INTERVAL / SECONDS_PER_MINUTE / EWMA.FIFTEEN_MINUTES);

  private initialized = false;
  private _rate = 0.0;

  private uncounted = 0;
  private readonly alpha: number;
  private readonly interval: number;

  /**
   * Create a new EWMA with a specific smoothing constant.
   *
   * @param alpha        the smoothing constant
   * @param interval     the expected tick interval
   * @param intervalUnit the time unit of the tick interval
   */
  constructor(
    alpha: number,
    interval: number,
    intervalUnit: TimeUnit = TimeUnit.MILLISECONDS,
  ) {
    this.interval = interval * IntervalMillis[intervalUnit];
    this.alpha = alpha;
  }

  /**
   * Creates a new EWMA which is equivalent to the UNIX one minute load average and which expects
   * to be ticked every 5 seconds.
   *
   * @return a one-minute EWMA
   */
  public static oneMinuteEWMA(): EWMA {
    return new EWMA(EWMA.M1_ALPHA, INTERVAL, TimeUnit.SECONDS);
  }

  /**
   * Creates a new EWMA which is equivalent to the UNIX five minute load average and which expects
   * to be ticked every 5 seconds.
   *
   * @return a five-minute EWMA
   */
  public static fiveMinuteEWMA(): EWMA {
    return new EWMA(EWMA.M5_ALPHA, INTERVAL, TimeUnit.SECONDS);
  }

  /**
   * Creates a new EWMA which is equivalent to the UNIX fifteen minute load average and which
   * expects to be ticked every 5 seconds.
   *
   * @return a fifteen-minute EWMA
   */
  public static fifteenMinuteEWMA(): EWMA {
    return new EWMA(EWMA.M15_ALPHA, INTERVAL, TimeUnit.SECONDS);
  }

  /**
   * Update the moving average with a new value.
   *
   * @param n the new value
   */
  update(n: number): void {
    this.uncounted += n;
  }

  /**
   * Mark the passage of time and decay the current rate accordingly.
   */
  tick(n = 1, epsilon?: number): void {
    const count = this.uncounted;
    this.uncounted = 0;
    let instantRate = count / this.interval;
    const hasEpsilon = typeof epsilon === 'number';
    while (n > 0) {
      if (this.initialized) {
        this._rate += this.alpha * (instantRate - this._rate);
        if (hasEpsilon && this._rate < epsilon) {
          this._rate = 0; // ????
          break;
        }
      } else {
        this._rate = instantRate;
        instantRate = 0;
        this.initialized = true;
      }
      n--;
    }
  }

  reset(): void {
    this.uncounted = 0;
    this.initialized = false;
    this._rate = 0;
  }

  /**
   * Returns the rate in the given units of time.
   *
   * @param rateUnit the unit of time
   * @return the rate
   */
  rate(rateUnit: TimeUnit = TimeUnit.MILLISECONDS): number {
    const conversion = IntervalMillis[rateUnit];
    return this._rate * conversion;
  }

  get baseRate(): number {
    return this._rate;
  }
}
