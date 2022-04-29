import { Transform } from '../events';
import {
  Distribution,
  MetricName,
  Tags,
  tagsToMap,
} from '../metric-name';
import { MetricType } from '../types';
import { Metrics } from '../metrics';
import { Snapshot } from '../snapshot';

/*
 * How to match a metric name and convert it into a distribution.
 */
export interface MetricMatcher {
  // match returns true if this metric should be converted to a distribution.
  match: string | RegExp | ((name: MetricName) => boolean);

  // which tags should be removed? (each unique tag combination is treated as a data point.)
  sortByTags: string[];

  // if present, override the metric name.
  name?: string;

  // if present, add these tags to the distribution name.
  addTags?: Tags;

  // if present, override the default percentiles list.
  percentiles?: number[];

  // if present, override the default error rank.
  error?: number;
}

class Matcher {
  constructor(
    public filter: (name: MetricName) => boolean,
    public getDistribution: (name: MetricName) => Distribution,
  ) {
    // pass.
  }
}

/*
 * Filter some counters & gauges and convert them into distributions. Each
 * matching counter & gauge will be sorted by a selected set of tags, with
 * each distinct metric becoming a data point in the output metric. For
 * example, if the tag set is `state`, then these two metrics:
 *
 *     userCount{type=registered,state=CA} = 16
 *     userCount(type=registered,state=NV) = 9
 *
 * would become the single distribution `userCount{type=registered}`, with
 * two data points (9 and 16).
 *
 * This is a transform meant to be used in a `map` of snapshot events from
 * the `MetricsRegistry`:
 *
 *     registry.events.map(tagDistribution(metrics, [ ... ])).forEach(snapshot => ...);
 */
export function tagDistribution(
  metrics: Metrics,
  ...metricMatchers: MetricMatcher[]
): Transform<Snapshot, Snapshot> {
  const newDistributions = new Map<string, Distribution>();

  const matchers = metricMatchers.map((m) => {
    const filter =
      m.match instanceof Function
        ? m.match
        : m.match instanceof RegExp
        ? (x: MetricName) => (m.match as RegExp).test(x.name)
        : (x: MetricName) => m.match == x.name;
    const getDistribution = (x: MetricName) => {
      const tags = new Map(x.tags);
      m.sortByTags.forEach((k) => tags.delete(k));
      const name = metrics.distribution(
        m.name || x.name,
        tagsToMap(tags, m.addTags),
        m.percentiles,
        m.error,
      );
      const existing = newDistributions.get(name.canonical);
      if (existing) return existing;
      newDistributions.set(name.canonical, name);
      return name;
    };
    return new Matcher(filter, getDistribution);
  });

  return (snapshot: Snapshot) => {
    const map = new Map<MetricName, number>();

    for (const [metric, value] of snapshot.map) {
      if (metric.type != MetricType.Distribution) {
        const matcher = matchers.filter((m) => m.filter(metric))[0];
        if (matcher) {
          metrics.addDistribution(matcher.getDistribution(metric), value);
        } else {
          map.set(metric, value);
        }
      } else {
        map.set(metric, value);
      }
    }

    // add any new distributions we computed.
    for (const d of newDistributions.values()) {
      const metric = metrics.registry.get(d);
      if (metric) metric.capture(map);
    }

    return new Snapshot(snapshot.registry, snapshot.timestamp, map);
  };
}
