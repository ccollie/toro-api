import { MetricName } from './metric-name';
import { Registry } from './registry';
import { DDSketch } from '@datadog/sketches-js';

/*
 * Snapshot of the values of every metric in the system at a given time.
 * The snapshot is exposed in raw form as `map`, a Map of metric objects to
 * numeric values.
 */
export class Snapshot {
  public distributions: Map<MetricName, DDSketch> = new Map<
    MetricName,
    DDSketch
  >();

  constructor(
    public readonly registry: Registry,
    public readonly timestamp: number,
    public readonly map: Map<MetricName, number>,
  ) {
    // pass.
  }

  /*
   * Return a flattened `Map<string, number>` that converts each MetricName
   * into a string, using the provided formatter. The default formatter
   * generates the canonical (OpenTSDB-style) name, like
   * `name{tag=value,tag=value}`.
   */
  flatten(
    formatter: (name: MetricName) => string = (name: MetricName) =>
      name.format(),
  ): Map<string, number> {
    const map = new Map<string, number>();
    for (const [metric, value] of this.map) {
      if (value == null || value === undefined) continue;
      map.set(formatter(metric), value);
    }
    return map;
  }

  /*
   * Like `flatten`, but emit a flat json object instead of a map.
   */
  toJson(
    formatter: (name: MetricName) => string = (name: MetricName) =>
      name.format(),
  ): { [key: string]: number } {
    const rv: any = {};
    for (const [key, value] of this.flatten(formatter).entries()) {
      rv[key] = value;
    }
    return rv;
  }

  // for debugging and tests
  toString() {
    const map = this.flatten();
    return (
      'Snapshot(' +
      Array.from(map.keys())
        .sort()
        .map((key) => `${key}=${map.get(key)}`)
        .join(', ') +
      ')'
    );
  }
}
