// different metric types have different implementations:
import boom from '@hapi/boom';
import { MetricType } from './types';
import { parseMetricName } from './metric-name-parser';
import { DEFAULT_ERROR, DEFAULT_PERCENTILES } from './registry';
import { AggregationType } from '../metrics';
import { DefaultAggregationType } from './metrics-info';

export const QueueTagKey = 'queue';
export const HostTagKey = 'host';
export const InstanceTagKey = 'instance';
export const QueueIdTagKey = 'queue_id';
export const JobNameTagKey = 'jobName';
export const PercentilesTagKey = '__pct__';
export const ErrorTagKey = '__err__';

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
  type: MetricType.Distribution;
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

  static fromCanonicalName(canonical: string, baseTags?: Tags): MetricName {
    const { name, tags, fieldName, metric } = parseMetricName(canonical);

    if (!metric) {
      throw boom.badData(`Unknown metric: "${name}"`);
    }
    const type = metric.metricType;
    switch (type) {
      case MetricType.Gauge:
        return new Gauge(name, baseTags, tags, fieldName);
      case MetricType.Counter:
        return new Counter(name, baseTags, tags, fieldName);
      case MetricType.Distribution: {
        // ICKY. Not very LSP
        let percentiles = getNumericArrayValue(tags, PercentilesTagKey);
        if (percentiles.length === 0) percentiles = DEFAULT_PERCENTILES;
        const error = getNumberTagValue(tags, ErrorTagKey) ?? DEFAULT_ERROR;
        if (!percentiles.every((x) => x > 0 && x < 1)) {
          throw boom.badData(
            'percentiles: expected array of numbers between 0 and 1',
          );
        }
        if (
          (error !== undefined && !Number.isFinite(error)) ||
          error < 0 ||
          error >= 1
        ) {
          throw boom.badData('error: expected a number between 0 and 1');
        }
        return new Distribution(
          name,
          baseTags,
          tags,
          percentiles,
          error,
          fieldName,
        );
      }
    }
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
    const { name, tags, fieldName: _field } = parseMetricName(canonical);
    switch (type) {
      case MetricType.Gauge:
        return new Gauge(name, tags, fieldName ?? _field);
      case MetricType.Counter:
        return new Counter(name, tags, fieldName ?? _field);
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
        return new Distribution(
          name,
          tags,
          percentiles,
          error,
          fieldName ?? _field,
        );
      }
    }
  }

  get defaultAggregation(): AggregationType {
    return DefaultAggregationType[this.type];
  }

  getTagValue(name: string): string {
    return this.tags.get(name);
  }

  getNumberTagValue(name: string): number | undefined {
    return getNumberTagValue(this.tags, name);
  }

  getArrayTagValue(name: string): string[] {
    return getArrayTagValue(this.tags, name);
  }

  getNumericArrayValue(tag: string): number[] {
    return getNumericArrayValue(this.tags, tag);
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

function getNumberTagValue(
  tags: Map<string, string>,
  name: string,
): number | undefined {
  const val = tags.get(name);
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

function getArrayTagValue(tags: Map<string, string>, name: string): string[] {
  const val = tags.get(name);
  if (!val) return [];
  return val.split(',');
}

function getNumericArrayValue(
  tags: Map<string, string>,
  key: string,
): number[] {
  const items = getArrayTagValue(tags, key);
  return items.map((val) => {
    const x = parseFloat(val);
    if (!Number.isFinite(x))
      throw new RangeError(
        `Getting ${key}[]; Cannot parse tag value ${val} as a number`,
      );
    return x;
  });
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

function distributionTags(
  baseTags: Tags,
  tags: Tags = NoTags,
  percentiles: number[],
  error: number,
): Map<string, string> {
  const map = tagsToMap(baseTags, tags);
  const percentilesValue = percentiles
    .sort()
    .map((p) => p.toString())
    .join(',');
  map.set(PercentilesTagKey, percentilesValue);
  map.set(ErrorTagKey, error.toString());
  return map;
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
    super(
      MetricType.Distribution,
      name,
      distributionTags(baseTags, tags, percentiles, error),
      fieldName,
    );
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
    const { percentiles, error, canonical, fieldName } = this;
    return {
      type: MetricType.Distribution,
      canonical,
      fieldName,
      percentiles,
      error,
    };
  }
}
