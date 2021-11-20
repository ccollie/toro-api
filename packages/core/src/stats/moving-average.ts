'use strict';
// copied from https://github.com/ZpmFred/moving-average

/**
 * An exponentially-weighted moving average.
 *
 * @see <a href="http://www.teamquest.com/pdfs/whitepaper/ldavg1.pdf">UNIX Load Average Part 1: How
 *      It Works</a>
 * @see <a href="http://www.teamquest.com/pdfs/whitepaper/ldavg2.pdf">UNIX Load Average Part 2: Not
 *      Your Average Average</a>
 * @see <a href="http://en.wikipedia.org/wiki/Moving_average#Exponential_moving_average">EMA</a>
 */
export interface IMovingAverage {
  reset: (value?: number) => void;
  update: (tm: number, value: number) => void;
  value: number;
  variance: number;
  deviation: number;
  forecast: number;
}

export function MovingAverage(timespan: number): IMovingAverage {
  if (typeof timespan !== 'number') {
    throw new Error(
      'must provide a timespan to the moving average constructor',
    );
  }

  if (timespan <= 0) {
    throw new Error(
      'must provide a timespan > 0 to the moving average constructor',
    );
  }

  let ma = 0; // moving average
  let v = 0; // variance
  let d = 0; // deviation
  let f = 0; // forecast

  let previousTime: number;
  let firstTime: number;
  let primed = false;

  function alpha(t: number, pt: number): number {
    let localTimespan = timespan;

    if (!primed) {
      if (!firstTime) {
        firstTime = t;
      }

      localTimespan = Math.max(1, Math.min(t - firstTime, timespan));
      primed = localTimespan === timespan;
    }

    return 1 - Math.exp(-(t - pt) / localTimespan);
  }

  function update(tm: number, value: number) {
    // todo: make sure time > previousTime;
    if (previousTime) {
      // calculate moving average
      const a = alpha(tm, previousTime);
      const diff = value - ma;
      const incr = a * diff;
      ma = a * value + (1 - a) * ma;
      // calculate variance & deviation
      v = (1 - a) * (v + diff * incr);
      d = Math.sqrt(v);
      // calculate forecast
      f = ma + a * diff;
    } else {
      ma = value;
    }
    previousTime = tm;
  }

  function reset(value?: number) {
    primed = false;
    v = 0;
    f = 0;
    ma = 0;
    firstTime = undefined;
    previousTime = undefined;
    if (typeof value !== 'undefined') {
      ma = value;
    }
  }

  // Exponential Moving Average
  return {
    update,
    reset,
    get value() {
      return ma ?? 0;
    },
    get variance() {
      return v;
    },
    get deviation() {
      return d;
    },
    get forecast() {
      return f;
    },
  };
}
