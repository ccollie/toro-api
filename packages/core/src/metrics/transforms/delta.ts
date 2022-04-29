import { MetricType } from '../types';
import { MetricName } from '../metric-name';
import { Transform } from '../events';
import { Snapshot } from '../snapshot';

/*
 * Convert "counter" metrics into deltas, so that the resulting snapshot is
 * entirely made up of (gauge-like) simultaneous values.
 *
 * This is a transform meant to be used in a `map` of snapshot events from
 * the `MetricsRegistry`:
 *
 *     registry.events.map(deltaSnapshots()).forEach(snapshot => ...);
 */
export function deltaSnapshots(): Transform<Snapshot, Snapshot> {
  // previous values for counters
  const previous = new Map<string, number>();

  return (snapshot: Snapshot) => {
    const map = new Map<MetricName, number>();

    for (const [metric, value] of snapshot.map) {
      let newValue = value;

      if (metric.type == MetricType.Counter) {
        newValue = value - (previous.get(metric.canonical) || 0);
        previous.set(metric.canonical, value);
      }

      map.set(metric, newValue);
    }

    // remove state for anything that's been wiped out.
    const currentKeys = new Set();
    for (const metric of snapshot.map.keys()) currentKeys.add(metric.canonical);
    for (const key of previous.keys())
      if (!currentKeys.has(key)) previous.delete(key);

    return new Snapshot(snapshot.registry, snapshot.timestamp, map);
  };
}
