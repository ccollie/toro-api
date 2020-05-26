import config from '../config';
import { firstChar } from '../lib/utils';
import { Queue } from 'bullmq';

const statsPrefix = config.getValue('statsPrefix', 'toro');

export function getHostKey(host: string, tag: string = null): string {
  return `${statsPrefix}:${host}` + (tag ? `:${tag}` : '');
}

export function getLockKey(host: string): string {
  return getHostKey(host, 'lock');
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
  host: string,
  queue: Queue,
  jobType: string,
  tag: string,
  granularity: string = null,
): string {
  let key = getKey(host, queue, jobType, `stats:${tag}`);
  const suffix = firstChar(granularity);
  if (suffix) {
    key = `${key}:1${suffix}`;
  }
  return key;
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
  return `${queue.keys.meta}:toro`;
}
