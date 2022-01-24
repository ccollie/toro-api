import { QueueFilterStatus, SortOrderEnum } from '@/types';
import type { Queue, Maybe, HostQueuesFilter, QueueFilter } from '@/types';
import { escapeRegExp } from '@/lib';
import { get } from '@/lib/nodash';

// these are just examples, we can sort by any field on a Queue
const FieldMap: Record<string, string> = {
  name: 'name',
  mean: 'statsAggregate.mean',
  median: 'statsAggregate.median',
  '90th': 'statsAggregate.p90',
  '95th': 'statsAggregate.p95',
  '99th': 'statsAggregate.p99',
  throughput: 'throughput.m15Rate',
  'error rate': 'errorRate.m15Rate',
  'wait time': 'waitTimeAvg',
};

export const DEFAULT_SORT_FIELDS = Object.keys(FieldMap);
export type SortField = keyof typeof FieldMap;

function isNumericField(field: SortField): boolean {
  return field !== 'name';
}

const DEFAULT_SORT_ORDER = SortOrderEnum.Asc;
const DEFAULT_SORT_FIELD = DEFAULT_SORT_FIELDS[0];

export const DefaultQueueFilter: QueueFilter = {
  sortBy: DEFAULT_SORT_FIELD,
  sortOrder: DEFAULT_SORT_ORDER,
};

export function toSortField(sortBy: string): SortField {
  return FieldMap[sortBy] || sortBy;
}

export function isFilterEmpty(filter?: HostQueuesFilter): boolean {
  if (!filter) return true;
  const {
    search,
    prefixes,
    statuses = [],
    exclude = [],
    include = [],
  } = filter;
  return (
    !search &&
    !prefixes?.length &&
    exclude?.length === 0 &&
    include?.length === 0 &&
    (statuses?.length === 0 || statusesEqual(statuses!, AllStatuses))
  );
}

export function filterQueues(queues: Queue[], filter?: QueueFilter): Queue[] {
  if (!filter) return queues;
  const {
    search,
    prefixes = [],
    statuses = [],
    exclude = [],
    include = [],
  } = filter;
  const includeSet = new Set(include);
  const excludeSet = new Set(exclude);

  if (queues.length) {
    const checkPaused = statuses!.includes(QueueFilterStatus.Paused);
    const checkRunning = statuses!.includes(QueueFilterStatus.Running);
    const checkActive = statuses!.includes(QueueFilterStatus.Active);
    const checkInactive = statuses!.includes(QueueFilterStatus.Inactive);

    const regex = search ? new RegExp(escapeRegExp(search), 'i') : null;
    queues = queues.filter((q) => {
      let valid =
        (!include!.length || includeSet.has(q.id)) && !excludeSet.has(q.id);
      if (valid && prefixes?.length) {
        valid = prefixes.some((p) => q.prefix === p);
      }
      if (valid && regex) {
        valid = regex.test(q.name);
      }
      if (valid) {
        const active = !!q.workerCount;
        if (checkInactive && checkActive) {
          valid = true;
        } else if (checkInactive) {
          valid = !active;
        } else if (checkActive) {
          valid = active;
        }
      }
      if (valid) {
        if (checkPaused && checkRunning) {
          valid = true;
        } else if (checkPaused) {
          valid = q.isPaused;
        } else if (checkRunning) {
          valid = !q.isPaused;
        }
      }
      return valid;
    });
  }

  return queues;
}

type QueueSortFn = (a: Queue, b: Queue) => number;

function sortFactory(
  field: SortField,
  defaultVal: string | number,
  ascending: boolean,
): QueueSortFn {
  return (a, b) => {
    const aVal = get(a, field, defaultVal);
    const bVal = get(b, field, defaultVal);
    const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    return ascending ? cmp : -1 * cmp;
  };
}

function getSortFn(field: SortField, ascending: boolean): QueueSortFn {
  const defaultVal = isNumericField(field) ? 0 : '';
  const sortFn = sortFactory(field, defaultVal, ascending);
  if (field !== 'name') {
    // secondary sort by name
    const nameSortFn = sortFactory('name', '', true);
    return (a, b) => {
      const cmp = sortFn(a, b);
      return cmp === 0 ? nameSortFn(a, b) : cmp;
    };
  }
  return sortFn;
}

export function sortQueues(filter: QueueFilter, queues: Queue[]): Queue[] {
  if (queues.length) {
    const { sortBy = 'name', sortOrder = SortOrderEnum.Asc } = filter;
    const field = toSortField(sortBy);
    const comparator = getSortFn(field, sortOrder === SortOrderEnum.Desc);
    const sorted = [...queues];
    sorted.sort(comparator);
    return sorted;
  }
  return [];
}

export const AllStatuses = [
  QueueFilterStatus.Inactive,
  QueueFilterStatus.Active,
  QueueFilterStatus.Paused,
  QueueFilterStatus.Running,
];

export function statusesEqual(
  a?: QueueFilterStatus[],
  b?: QueueFilterStatus[],
): boolean {
  const a1 = new Set(a ?? AllStatuses);
  const b1 = new Set(b ?? AllStatuses);
  if (a1.size !== b1.size) return false;
  for (const x of a1) if (!b1.has(x)) return false;
  return true;
}

export function stringsEqual(a?: string[], b?: string[]): boolean {
  const a1 = new Set(a ?? []);
  const b1 = new Set(b ?? []);
  if (a1.size !== b1.size) return false;
  for (const x of a1) if (!b1.has(x)) return false;
  return true;
}

export function normalizeFilter(filter: QueueFilter): QueueFilter {
  const result: QueueFilter = {
    sortOrder: filter.sortOrder || SortOrderEnum.Asc,
    sortBy: filter.sortBy || 'name',
    exclude: filter.exclude,
    include: filter.include,
  };
  if (filter.search) {
    result.search = filter.search;
  }
  if (filter.prefixes && filter.prefixes.length) {
    result.prefixes = filter.prefixes;
  }
  if (filter.statuses === undefined) {
    result.statuses = [...AllStatuses];
  }
  normalizeExclusions(result);
  return result;
}

export function normalizeExclusions(filter: QueueFilter): void {
  if (filter.exclude?.length && filter.include?.length) {
    const included = new Set(filter.include ?? []);
    for (let i = 0; i < filter.exclude.length; i++) {
      const id = filter.exclude[i];
      if (included.has(id)) {
        filter.exclude.splice(i, 1);
        i--;
      }
    }
  }
}

// if a value is set to its default value, remove it from the object
export function normalizeFilterForSearchNavigation(
  filter: QueueFilter,
): QueueFilter {
  const result: QueueFilter = {
    ...filter,
  };

  if (typeof result.search === 'string') {
    result.search = result.search.trim();
    if (!result.search) {
      delete result.search;
    }
  }

  if (Array.isArray(result.prefixes)) {
    const items = result.prefixes.map((x) => x.trim()).filter(Boolean);
    if (!items.length) {
      delete result.prefixes;
    }
  }

  if (result.statuses?.length && statusesEqual(result.statuses, AllStatuses)) {
    delete result.statuses;
  }

  normalizeExclusions(result);

  // we chose specific queues, no need for statuses
  if (result.include?.length && Array.isArray(filter.statuses)) {
    delete result.statuses;
  }
  if (result.exclude && !result.exclude.length) {
    delete result.exclude;
  }
  if (result.include && !result.include.length) {
    delete result.include;
  }
  return result;
}

export function stringEqual(
  a: Maybe<string> | undefined,
  b: Maybe<string> | undefined,
): boolean {
  if (!a && !b) return true;
  return a === b;
}

function sortFieldsEqual(
  a: SortField | undefined,
  b: SortField | undefined,
): boolean {
  a = !a ? DEFAULT_SORT_FIELD : a;
  b = !b ? DEFAULT_SORT_FIELD : b;
  return a === b;
}

export function filtersEqual(a: QueueFilter, b: QueueFilter): boolean {
  a = normalizeFilterForSearchNavigation(a);
  b = normalizeFilterForSearchNavigation(b);
  const emptyStrings: string[] = [];
  return (
    statusesEqual(a.statuses ?? [], b.statuses ?? []) &&
    stringsEqual(a.prefixes ?? [], b.prefixes ?? []) &&
    stringEqual(a.search, b.search) &&
    stringsEqual(a.exclude ?? emptyStrings, b.exclude ?? emptyStrings) &&
    stringsEqual(a.include ?? emptyStrings, b.include ?? emptyStrings) &&
    sortFieldsEqual(a.sortBy, b.sortBy) &&
    a.sortOrder === b.sortOrder
  );
}
