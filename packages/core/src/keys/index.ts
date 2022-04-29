import { getValue as getConfig } from '../config/index';
import { firstChar } from '@alpen/shared';
import { Queue } from 'bullmq';
import { MetricLike, getCanonicalName } from '../metrics/utils';
import { MetricGranularity } from '../metrics';

const statsPrefix = getConfig('statsPrefix', 'alpen');

export function getHostKey(host: string | null, ...tags: string[]): string {
  return (
    `${statsPrefix}:host:${host}` + (tags.length ? ':' + tags.join(':') : '')
  );
}

export function getLockKey(host: string): string {
  return getHostKey(host, 'lock');
}

export function getGranularitySuffix(
  granularity?: MetricGranularity,
): string | null {
  if (!granularity) return null;
  if (granularity === MetricGranularity.Month) {
    return 'mt';
  }
  return firstChar(granularity).toLowerCase();
}

export function getKey(
  host: string | null,
  queue: Queue,
  jobType?: string | null,
  tag?: string | null,
): string {
  if (jobType) {
    return [queue.toKey(jobType), tag].join(':');
  } else if (queue) {
    return queue.toKey(tag ?? '');
  } else {
    return getHostKey(host, ...(tag ? [tag] : []));
  }
}

export function getHostMetricsKey(
  host: string,
  metric?: MetricLike,
  unit?: MetricGranularity,
): string {
  const parts = ['metrics'];
  if (metric) {
    parts.push(getCanonicalName(metric));
    // todo: if metric is set, suffix must also be set
    const suffix = getGranularitySuffix(unit);
    if (suffix) {
      parts.push(`1${suffix}`);
    }
  }
  return getHostKey(host, ...parts);
}

export function getQueueMetricDataKey(
  queue: Queue,
  metric: MetricLike,
  granularity?: MetricGranularity,
): string {
  const parts = ['metrics', getCanonicalName(metric)];
  const suffix = getGranularitySuffix(granularity);
  if (suffix) {
    parts.push(`1${suffix}`);
  }
  const fragment = parts.join(':');
  return queue.toKey(fragment);
}

export function getQueueStatsPattern(
  queue: Queue,
  granularity?: MetricGranularity,
): string {
  const pattern = getMetricsDataKey('', queue, '');
  const parts = pattern.split(':');
  const pos = parts.length - (!!granularity ? 2 : 1);
  parts[pos] = '*';
  return parts.join(':');
}

export function getRuleKey(queue: Queue, id?: string | null): string {
  const tag = 'rules' + (id ? `:${id}` : '');
  return getKey(null, queue, null, tag);
}

export function getRuleStateKey(queue: Queue, id?: string): string {
  const base = getRuleKey(queue, id);
  return `${base}:state`;
}

export function getAlertsKey(queue: Queue, ruleId: string): string {
  const ruleKey = getRuleKey(queue, ruleId);
  return `${ruleKey}:alerts`;
}

export function getQueueAlertsIndex(queue: Queue): string {
  return getKey(null, queue, null, 'alerts-index');
}

export function getMetricsKey(host: string, queue: Queue, id?: string): string {
  const tag = 'metrics' + (id ? `:${id}` : '');
  return getKey(host, queue, null, tag);
}

export function getMetricsDataKey(host: string, queue: Queue, id: string): string {
  const base = getMetricsKey(host, queue, id);
  return `${base}:data`;
}

export function getHostBusKey(host: string): string {
  return getHostKey(host, 'events');
}

export function getQueueBusKey(queue: Queue): string {
  return getKey(null, queue, null, 'bus');
}

export function getQueueAlertCountKey(queue: Queue): string {
  return getKey(null, queue, null, 'alert-count');
}

export function getHostAlertCountKey(host: string): string {
  return getHostKey(host, 'alertCount');
}

export function getJobSchemaKey(queue: Queue): string {
  return getKey(null, queue, null, 'job-schemas');
}

export function getJobFiltersKey(queue: Queue): string {
  return getKey(null, queue, null, 'job-filters');
}

export function getQueueMetaKey(queue: Queue): string {
  return `${queue.keys.meta}:${statsPrefix}`;
}
