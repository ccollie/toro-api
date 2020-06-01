import config from '../config';
import { firstChar } from './utils';
import { Queue } from 'bullmq';
import { StatsGranularity } from '../../types';

const statsPrefix = config.get('statsPrefix') || 'toro';

export function getHostKey(host: string, tag: string = null): string {
  return `${statsPrefix}:host:${host}` + (tag ? `:${tag}` : '');
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
  jobType: string,
  tag: string,
  granularity?: StatsGranularity,
): string {
  const parts = ['stats'];
  if (jobType) parts.push(jobType);
  parts.push(tag);
  const suffix = getGranularitySuffix(granularity);
  if (suffix) {
    parts.push(`1${suffix}`);
  }
  const fragment = parts.join(':');
  return queue.toKey(fragment);
}

export function getQueueStatsPattern(queue: Queue): string {
  return getStatsKey(queue, null, '*');
}

export function getRuleKey(queue: Queue, id: string = null): string {
  const tag = 'rules' + (id ? `:${id}` : '');
  return getKey(null, queue, null, tag);
}

export function getAlertsKey(queue: Queue, ruleId: string): string {
  const ruleKey = getRuleKey(queue, ruleId);
  return `${ruleKey}:alerts`;
}

export function getQueueAlertsIndex(queue: Queue): string {
  return getKey(null, queue, null, 'alerts-index');
}

export function getHostBusKey(host: string): string {
  return getHostKey(host, 'events');
}

export function getQueueBusKey(queue: Queue): string {
  return getKey(null, queue, null, 'bus');
}

export function getHostChannelKey(
  host: string,
  id: string,
  tag?: string,
): string {
  let key = getHostKey(host, `channels:${id}`);
  if (tag) key = `${key}:${tag}`;
  return key;
}

export function getJobSchemaKey(queue: Queue): string {
  return getKey(null, queue, null, 'job-schemas');
}

const granularitySegment = '(:w+)?';
const regexCache = new Map();

export function getRegex(spec): RegExp {
  let regex = regexCache.get(spec);
  if (!regex) {
    regex = new RegExp(spec, 'ig');
  }
  return regex;
}

export function getKeyRegex(type: string): RegExp {
  const fragment = `:stats:${type}${granularitySegment}`;
  return getRegex(fragment);
}

export function getQueueMetaKey(queue: Queue): string {
  return `${queue.keys.meta}:${statsPrefix}`;
}
