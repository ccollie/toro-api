import type {
  MetricTypeName,
} from './types';
import type { Predicate } from '../types';
import { HostTagKey, MetricName, QueueTagKey } from './metric-name';

export function createJobNameFilter(
  jobNames?: string | string[],
): Predicate<string> {
  if (!jobNames) {
    return () => true;
  } else if (typeof jobNames === 'string') {
    return (name: string) => name === jobNames;
  } else if (jobNames.length === 0) {
    return () => true;
  } else if (jobNames.length === 1) {
    return (name: string) => name === jobNames[0];
  }
  return (name: string) => !!name && jobNames.includes(name);
}

export function isHostMetric(type: MetricTypeName | MetricName): boolean {
  if (type instanceof MetricName) {
    const host = type.getTagValue(HostTagKey);
    const queue = type.getTagValue(QueueTagKey);
    return !!host && queue?.length === 0;
  }
  const str = '' + type;
  return str.startsWith('redis') || str.includes('queue');
}
