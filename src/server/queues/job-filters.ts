import boom from '@hapi/boom';
import { getJobFiltersKey, getUniqueId, safeParse } from '../lib';
import { Queue } from 'bullmq';
import { JobFilter, JobStatusEnum } from '../../types';
import { accepts as isValid, parse } from 'mongodb-language-model';
import { FilteredJobsResult, Scripts } from '../commands/scripts';

function unserialize(data: string): JobFilter {
  const value = safeParse(data);
  if (!value || typeof value !== 'object') return null;
  return value as JobFilter;
}

function serialize(jobFilter: JobFilter): string {
  return JSON.stringify(jobFilter);
}

const UnsupportedOperators = new Set<string>([
  '$box',
  '$comment',
  '$day',
  '$mergeObjects',
  '$maxDistance',
  '$minDistance',
  '$minute',
  '$millisecond',
  '$objectToArray',
  '$polygon',
  '$uniqueDocs',
  '$week',
  '$where',
  '$year',
]);

const InvalidPrefixes = [
  '$bit',
  '$day',
  '$geo',
  '$near',
  '$iso',
  '$set',
  '$std',
];

function isSupported(op: string): boolean {
  for (let i = 0; i < InvalidPrefixes.length; i++) {
    if (op.startsWith(InvalidPrefixes[i])) return false;
  }
  return !UnsupportedOperators.has(op);
}

export function validateFilterExpression(expr: Record<string, any>): void {
  // todo: substitute our special ops for standard ones
  // ($match, $startsWith, $endsWith and $toBoolEx)
  // convert dates to int, $numberlong etc to equivalents
  // also flag non-supported (i.e. geo, bit, date, etc)
  const asString = JSON.stringify(expr);
  if (!isValid(asString)) {
    throw boom.badData('Invalid query filter', expr);
  }
}

function validateFilter(filter: JobFilter) {
  if (!filter.id) {
    throw boom.badData('A filter requires an id');
  }
  if (!filter.name) {
    throw boom.badData('Missing filter name');
  }
  validateFilterExpression(filter.expression);
}

async function storeFilter(queue: Queue, filter: JobFilter): Promise<void> {
  const toStore = serialize(filter);
  const client = await queue.client;
  const key = getJobFiltersKey(queue);
  await client.hset(key, filter.id, toStore);
}

export async function addJobFilter(
  queue: Queue,
  name: string,
  status: JobStatusEnum | null,
  expression: Record<string, any>,
): Promise<JobFilter> {
  const filter: JobFilter = {
    id: getUniqueId(),
    name,
    status,
    expression,
    createdAt: Date.now(),
  };

  validateFilter(filter);
  await storeFilter(queue, filter);

  return filter;
}

export async function getJobFilter(
  queue: Queue,
  id: string,
): Promise<JobFilter> {
  const client = await queue.client;
  const key = getJobFiltersKey(queue);
  const value = await client.hget(key, id);
  return unserialize(value);
}

export async function updateJobFilter(
  queue: Queue,
  filter: JobFilter,
): Promise<boolean> {
  validateFilter(filter);
  const oldFilter = await getJobFilter(queue, filter.id);
  // see if we differ
  if (
    oldFilter &&
    oldFilter.name === filter.name &&
    oldFilter.status === filter.status &&
    oldFilter.expression === filter.expression
  ) {
    return false;
  }
  await storeFilter(queue, filter);
  return true;
}

export async function getJobFilters(
  queue: Queue,
  ids?: string[],
): Promise<JobFilter[]> {
  const client = await queue.client;
  const key = getJobFiltersKey(queue);
  let values: string[];
  const result: JobFilter[] = [];

  if (ids) {
    values = await client.hmget(key, ids);
  } else {
    const val = await client.hgetall(key);
    values = [];
    for (const id in val) {
      values.push(val[id]);
    }
  }

  values.forEach((value) => {
    const filter = unserialize(value);
    filter && result.push(filter);
  });

  return result;
}

export async function deleteJobFilter(
  queue: Queue,
  id: string,
): Promise<boolean> {
  const client = await queue.client;
  const key = getJobFiltersKey(queue);
  const deleted = await client.hdel(key, id);
  return !!deleted;
}

export async function deleteAllJobFilters(queue: Queue): Promise<number> {
  const client = await queue.client;
  const key = getJobFiltersKey(queue);
  const pipeline = client.multi();
  pipeline.hkeys(key);
  pipeline.del(key);
  const response = await pipeline.exec();
  const items = response[0][1];
  const count = items ? items.length : 0;
  const deleted = !!response[1][1];
  return deleted ? count : 0;
}

export async function getJobsByFilterId(
  queue: Queue,
  id: string,
  cursor: number,
  count?: number,
): Promise<FilteredJobsResult> {
  const filter = await getJobFilter(queue, id);
  if (!filter)
    throw boom.notFound(
      `No job filter with id "${id}" found for queue "${queue.name}"`,
    );

  return Scripts.getJobsByFilter(
    queue,
    filter.status,
    filter.expression,
    cursor,
    count,
  );
}