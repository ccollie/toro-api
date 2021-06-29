import config from '../config';
import { firstChar } from './utils';
import { Queue } from 'bullmq';
import { StatsGranularity, StatsMetricType } from '../../types';

const statsPrefix = config.get('statsPrefix') || 'toro';

export function getHostKey(host: string, ...tags: string[]): string {
  return (
    `${statsPrefix}:host:${host}` + (tags.length ? ':' + tags.join(':') : '')
  );
}

export function getLockKey(host: string): string {
  return getHostKey(host, 'lock');
}

function getGranularitySuffix(granularity: StatsGranularity): string {
  if (!granularity) return null;
  if (granularity === StatsGranularity.Month) {
    return 'mt';
  }
  return firstChar(granularity).toLowerCase();
}

export function getKey(
  host: string,
  queue: Queue,
  jobType: string = null,
  tag: string = null,
): string {
  if (jobType) {
    return [queue.toKey(jobType), tag].join(':');
  } else if (queue) {
    return queue.toKey(tag);
  } else {
    return getHostKey(host, tag);
  }
}

export function getStatsKey(
  queue: Queue,
  jobName: string,
  metric: StatsMetricType,
  granularity?: StatsGranularity,
): string {
  const parts = ['stats', metric];
  if (jobName) parts.push(jobName);
  const suffix = getGranularitySuffix(granularity);
  if (suffix) {
    parts.push(`1${suffix}`);
  }
  const fragment = parts.join(':');
  return queue.toKey(fragment);
}

export function getHostStatsKey(
  host: string,
  jobName: string,
  metric: StatsMetricType,
  unit: StatsGranularity,
): string {
  const parts = ['stats', metric];
  if (jobName) parts.push(jobName);
  const suffix = getGranularitySuffix(unit);
  if (suffix) {
    parts.push(`1${suffix}`);
  }
  return getHostKey(host, ...parts);
}

export function getQueueStatsPattern(
  queue: Queue,
  jobName: string = null,
  granularity?: StatsGranularity,
): string {
  const pattern = getStatsKey(queue, jobName, 'wait', granularity);
  const parts = pattern.split(':');
  const pos = parts.length - (!!granularity ? 2 : 1);
  parts[pos] = '*';
  return parts.join(':');
}

export function getRuleKey(queue: Queue, id: string = null): string {
  const tag = 'rules' + (id ? `:${id}` : '');
  return getKey(null, queue, null, tag);
}

export function getRuleStateKey(queue: Queue, id: string = null): string {
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

export function getMetricsKey(queue: Queue, id: string = null): string {
  const tag = 'metrics' + (id ? `:${id}` : '');
  return getKey(null, queue, null, tag);
}

export function getMetricsDataKey(queue: Queue, id: string): string {
  const base = getMetricsKey(queue, id);
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
