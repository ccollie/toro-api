import { DDSketch } from '@datadog/sketches-js';

// immutable snapshot of the samples, for calculating percentiles.
export class Snapshot {
  sketch: DDSketch;
  readonly percentiles: number[];
  readonly error: number;
  readonly count: number;
  readonly sum: number;
  readonly min: number;
  readonly max: number;

  constructor(dist: BiasedQuantileDistribution) {
    this.sketch = dist.sketch;
    this.error = dist.error;
    this.percentiles = [...dist.percentiles];
    const { sum, count, min, max } = dist.sketch;
    this.count = count;
    this.sum = sum;
    this.max = max;
    this.min = min;
  }

  getPercentile(percentile: number): number {
    return this.sketch.getValueAtQuantile(percentile);
  }
}

/*
 * Collect samples over a time period, keeping only enough data to compute
 * specific percentiles within a desired error range.
 *
 * This algorithm comes from the paper "Effective Computation of Biased
 * Quantiles over Data Streams".
 *
 * - percentiles: list of desired percentiles (median = 0.5)
 * - error: relative error allowed in the reported measurement
 */
export class BiasedQuantileDistribution {
  sketch: DDSketch;

  constructor(public percentiles = [0.5, 0.9, 0.95], public error = 0.01) {
    this.sketch = new DDSketch({ relativeAccuracy: error });
  }

  // add a sample.
  record(data: number) {
    this.sketch.accept(data);
  }

  // clear the samples, returning a snapshot of the previous results.
  resetWithSnapshot(): Snapshot {
    const rv = this.snapshot();
    this.reset();
    return rv;
  }

  // clear out any previously stored samples, and start over.
  reset(): void {
    this.sketch = new DDSketch({ relativeAccuracy: this.error });
  }

  // return an immutable view of the current sample set, for querying.
  snapshot(): Snapshot {
    return new Snapshot(this);
  }
}


export function deserializeSketch(arr: Uint8Array): DDSketch {
  return new DDSketch();
}
