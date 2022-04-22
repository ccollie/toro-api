// different metric types have different implementations:
import boom from '@hapi/boom';
import { parseMetricName } from './metric-name-parser';

export enum MetricType {
  Counter,
  Gauge,
  Distribution,
}

export const QueueTagKey = 'queue';
export const HostTagKey = 'host';
export const InstanceTagKey = 'instance';
export const QueueIdTagKey = 'queue_id';

export type Tags = Map<string, string> | { [key: string]: string };

export const NoTags = new Map<string, string>();

export interface SerializedGaugeName {
  type: MetricType.Gauge;
  canonical: string;
  fieldName?: string;
}

export interface SerializedCounterName {
  type: MetricType.Counter;
  canonical: string;
  fieldName?: string;
}

export interface SerializedDistributionName {
  type: MetricType;
  canonical: string;
  fieldName?: string;
  percentiles?: number[];
  error?: number;
}

export type SerializedMetricName =
  | SerializedCounterName
  | SerializedGaugeName
  | SerializedDistributionName;

/*
 * A metric name has a string name like "clientCount", and an optional list
 * of tags, each of which has a string name and string value (for example,
 * key "protocolVersion", value "2"). Tags allow the same metric to be
 * measured along several dimensions and collated later.
 *
 * Internally, it's represented as a string and a `Map<string, string>`,
 * with a canonical string form that looks like `name{key=val,key=val}`,
 * with the keys in sorted (deterministic) order.
 *
 * This class should be considered immutable. Modifications always return a
 * new object.
 *
 * We assume metric names are created at startup time (for the server or for
 * a session), so we do as much work as possible in the constructor.
 */
export abstract class MetricName {
  readonly canonical: string;

  protected constructor(
    public readonly type: MetricType,
    public readonly name: string,
    public readonly tags: Map<string, string>,
    // some exporters (like influx) give each name a sub-name
    public readonly fieldName?: string,
    // is this a manufactured gauge based on a distribution?
    public readonly computedFrom?: MetricName,
  ) {
    this.canonical = this.format();
    if (fieldName) this.canonical += ':' + fieldName;
  }

  toJSON(): SerializedMetricName {
    const { type, canonical, fieldName } = this;
    return {
      type,
      canonical,
      fieldName,
    };
  }

  static fromJSON(data: Record<string, any>): MetricName {
    const { type, canonical, fieldName } = data;
    if (
      type != MetricType.Gauge ||
      type != MetricType.Counter ||
      type != MetricType.Distribution
    ) {
      throw boom.badData('Invalid metric type from JSON: ' + type);
    }
    if (!canonical) {
      throw boom.badData('Missing canonical metric name');
    }
    const { name, tags } = parseMetricName(canonical);
    switch (type) {
      case MetricType.Gauge:
        return new Gauge(name, tags, fieldName);
      case MetricType.Counter:
        return new Counter(name, tags, fieldName);
      case MetricType.Distribution: {
        // ICKY. Not very LSP
        const { percentiles, error } = data;
        if (percentiles) {
          if (
            !Array.isArray(percentiles) ||
            !percentiles.every((x) => Number.isFinite(x) && x > 0 && x < 1)
          ) {
            throw boom.badData(
              'percentiles: expected array of numbers between 0 and 1',
            );
          }
        }
        if (
          (error !== undefined && !Number.isFinite(error)) ||
          error < 0 ||
          error >= 1
        ) {
          throw boom.badData('error: expected a number between 0 and 1');
        }
        return new Distribution(name, tags, percentiles, error, fieldName);
      }
    }
  }

  getTagValue(name: string): string {
    return this.tags.get(name);
  }

  getNumberTagValue(name: string): number | undefined {
    const val = this.getTagValue(name);
    if (val) {
      const result = parseFloat(val);
      // todo: should we throw ?
      if (!Number.isFinite(result)) {
        throw new Error('Cannot parse the value of "' + name + '" as a number');
      }
      return result;
    }
    return undefined;
  }

  /*
   * Format into a string. The formatter converts each tag's key/value pair
   * into a string, and the joiner adds any separators or surrounders. The
   * default formatters create the "canonical" version, using `=` for tags
   * and surrounding them with `{...}`.
   */
  format(
    formatter: (key: string, value: string) => string = (k, v) => `${k}=${v}`,
    joiner: (list: string[]) => string = (list) => '{' + list.join(',') + '}',
  ): string {
    if (this.tags.size == 0) return this.name;
    const keys = [...this.tags.keys()].sort();
    return (
      this.name + joiner(keys.map((k) => formatter(k, this.tags.get(k) || '')))
    );
  }
}

export function tagsToMap(
  baseTags: Tags,
  tags: Tags = NoTags,
): Map<string, string> {
  function toEntries(t: Tags): Iterable<[string, string]> {
    return t instanceof Map
      ? t.entries()
      : Object.keys(t).map((k) => [k, t[k].toString()] as [string, string]);
  }
  return new Map([...toEntries(baseTags), ...toEntries(tags)]);
}

export function splitMetricName(name: string): [string, string] {
  const n = name.indexOf('{');
  if (n < 0) {
    return [name, ''];
  }
  return [name.slice(0, n), name.slice(n)];
}

export class Counter extends MetricName {
  constructor(name: string, baseTags: Tags, tags: Tags, fieldName?: string) {
    super(MetricType.Counter, name, tagsToMap(baseTags, tags), fieldName);
  }
}

export class Gauge extends MetricName {
  constructor(
    name: string,
    baseTags: Tags,
    tags: Tags,
    fieldName?: string,
    computedFrom?: MetricName,
  ) {
    super(
      MetricType.Gauge,
      name,
      tagsToMap(baseTags, tags),
      fieldName,
      computedFrom,
    );
  }
}

export class Distribution extends MetricName {
  readonly percentileGauges: Gauge[];
  readonly countGauge: Gauge;
  readonly sumGauge: Gauge;

  constructor(
    name: string,
    baseTags: Tags,
    tags: Tags,
    public readonly percentiles: number[],
    public readonly error: number,
    fieldName?: string,
  ) {
    super(MetricType.Distribution, name, tagsToMap(baseTags, tags), fieldName);
    this.percentileGauges = percentiles.map(
      (p) =>
        new Gauge(this.name, this.tags, { p: p.toString() }, fieldName, this),
    );
    this.countGauge = new Gauge(
      this.name,
      this.tags,
      { p: 'count' },
      fieldName,
      this,
    );
    this.sumGauge = new Gauge(
      this.name,
      this.tags,
      { p: 'sum' },
      fieldName,
      this,
    );
  }

  toJSON(): SerializedDistributionName {
    const { percentiles, error } = this;
    return {
      ...super.toJSON(),
      percentiles,
      error,
    };
  }
}
