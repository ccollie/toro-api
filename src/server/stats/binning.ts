// https://github.com/eoinmurray/histogram/blob/master/histogram.js
'use strict';
import { isFunction, isNumber } from 'lodash';

const bisector = function (
  f: (arr: number[], val?: number, mid?: number) => number,
) {
  return {
    left: function (a: number[], x, lo = 0, hi): number {
      hi = hi || a.length;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (f(a, a[mid], mid) < x) lo = mid + 1;
        else hi = mid;
      }
      return lo;
    },
    right: function (a, x, lo = 0, hi): number {
      hi = hi || a.length;
      while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (x < f(a, a[mid], mid)) hi = mid;
        else lo = mid + 1;
      }
      return lo;
    },
  };
};

type HistogramBin = {
  x: number;
  y: number;
  dx: number;
  data: number[];
};

const histogram = function (opts) {
  const data = opts.data,
    bins_temp = opts.bins;

  const dataLength = bins_temp.length;

  let binner;
  this.data = data;
  const hist_bisector = bisector(function (d) {
    return d;
  });
  const bisectLeft = hist_bisector.left;
  const bisectRight = hist_bisector.right;
  const bisect = bisectRight;

  const minimum = function (array, f) {
    let i = -1,
      n = array.length,
      a,
      b;
    if (arguments.length === 1) {
      while (++i < n && !((a = array[i]) != null && a <= a)) a = undefined;
      while (++i < n) if ((b = array[i]) != null && a > b) a = b;
    } else {
      while (++i < n && !((a = f(array, array[i], i)) != null && a <= a))
        a = undefined;
      while (++i < n) if ((b = f(array, array[i], i)) != null && a > b) a = b;
    }
    return a;
  };

  const maximum = function (array, f) {
    let i = -1,
      n = array.length,
      a,
      b;
    if (arguments.length === 1) {
      while (++i < n && !((a = array[i]) != null && a <= a)) a = undefined;
      while (++i < n) if ((b = array[i]) != null && b > a) a = b;
    } else {
      while (++i < n && !((a = f.call(array, array[i], i)) != null && a <= a))
        a = undefined;
      while (++i < n)
        if ((b = f.call(array, array[i], i)) != null && b > a) a = b;
    }
    return a;
  };

  function value(x) {
    if (!arguments.length) return valuer;
    valuer = x;
    return histogram;
  }

  function range(x) {
    if (!arguments.length) return ranger;
    ranger = hist_functor(x);
    return histogram;
  }

  function hist_functor(v) {
    return isFunction(v) ? v : () => v;
  }

  function makeBins(x) {
    if (!arguments.length) return binner;
    binner = isNumber(x)
      ? (range) => histogramBinFixed(range, x)
      : hist_functor(x);
    return histogram;
  }

  function frequency(x) {
    if (!arguments.length) return frequency;
    frequency = !!x;
    return histogram;
  }

  function histogramBinFixed(range, n): number[] {
    const b = +range[0],
      m = (range[1] - b) / n,
      f = new Array(n);
    let x = -1;
    while (++x <= n) f[x] = m * x + b;
    return f;
  }

  function histogramBinSturges(range, values) {
    return histogramBinFixed(
      range,
      Math.ceil(Math.log(values.length) / Math.LN2 + 1),
    );
  }

  function histogramRange(values) {
    return [minimum(values), maximum(values)];
  }

  (frequency = true),
    (valuer = Number),
    (ranger = histogramRange),
    (binner = histogramBinSturges);

  makeBins(bins_temp);

  const bins = [],
    values = data.map(valuer),
    n = values.length,
    k = frequency ? 1 : 1 / n;

  const range = ranger(values, dataLength);
  const thresholds = binner(range, values, dataLength);
  const m = thresholds.length - 1;
  let i = -1;
  while (++i < m) {
    const bin = (bins[i] = []);
    bin.dx = thresholds[i + 1] - (bin.x = thresholds[i]);
    bin.y = 0;
  }

  if (m > 0) {
    let i = -1;
    while (++i < n) {
      const x = values[i];
      if (x >= range[0] && x <= range[1]) {
        const bin = bins[bisect(thresholds, x, 1, m) - 1];
        bin.y += k;
        bin.push(data[i]);
      }
    }
  }

  return bins;
};
