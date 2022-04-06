import {
  collectExpressionIdentifiers,
  Expression,
  ExprEval,
} from '@alpen/shared';
import { Queue } from 'bullmq';
import LRUCache from 'lru-cache';
import * as semver from 'semver';
import { getConfigNumeric } from '../lib/config-utils';
import type { JobSearchStatus, Maybe } from '../types';
import { extractJobsData, getFieldsToFetch } from './filter-utils';

/// see https://github.com/taskforcesh/bullmq/blob/master/src/classes/queue-keys.ts
const SPECIAL_KEYS = new Set<string>([
  'active',
  'wait',
  'waiting',
  'paused',
  'resumed',
  'id',
  'delayed',
  'priority',
  'stalled-check',
  'completed',
  'failed',
  'stalled',
  'repeat',
  'limiter',
  'drained',
  'progress',
  'meta',
  'events',
  'delay',
]);

export type FilterFn = (
  queue: Queue,
  keys: string[],
) => string[] | Promise<string[]>;

const expressionCache = new LRUCache<string, FilterFn>({ maxSize: 20 });

export type TKeyCursorIteratorArgs = {
  status?: JobSearchStatus;
  cursor?: string;
  scanCount?: number;
  filter?: string;
  pattern?: string;
};

export function getIdCursorIterator(
  queue: Queue,
  args: TKeyCursorIteratorArgs,
): Maybe<AbstractIterator> {
  const redisKey = !args.status ? '' : queue.toKey(args.status);

  const filterFn: FilterFn = args.filter
    ? createExpressionFilter(queue, args.filter)
    : undefined;

  const config: TIteratorConfig = {
    cursor: args.cursor,
    scanCount: args.scanCount,
    filter: filterFn,
  };

  if (!redisKey) {
    return new KeyspaceIterator(queue, redisKey, config);
  }

  switch (args.status) {
    case 'completed':
    case 'failed':
    case 'delayed':
    case 'waiting-children':
      return new ZSetIterator(queue, redisKey, config);
    case 'active':
    case 'waiting':
    case 'paused':
      return new ListIterator(queue, redisKey, config);
  }
}

type TIteratorConfig = {
  cursor?: string;
  scanCount?: number;
  filter?: FilterFn;
  pattern?: string;
};

abstract class AbstractIterator {
  protected _scanCount: number;
  protected _cursor = '0';
  protected _pattern: string;
  protected _patternRegex: RegExp;
  protected _seen: Set<string> = new Set();
  protected _filterFn: FilterFn;

  constructor(protected _queue: Queue, config: TIteratorConfig) {
    this._scanCount = config.scanCount || getScanCount();
    this._cursor = config.cursor || '0';
    this._pattern = config.pattern;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  destroy() {}

  protected setKey(key: string) {
    this._cursor = key;
  }

  protected resetCursor() {
    this._cursor = null;
    this._seen.clear();
  }

  protected filterIdsByPattern(ids: string[]): string[] {
    if (!this._pattern) {
      return ids;
    }
    this._patternRegex = this._patternRegex || new RegExp(this._pattern);
    return ids.filter((id) => this._patternRegex.test(id));
  }

  protected async filterIdsByFunction(ids: string[]): Promise<string[]> {
    if (!this._filterFn) {
      return ids;
    }
    return this._filterFn(this._queue, ids);
  }

  abstract generator(): AsyncGenerator<string[]>;

  get cursor(): string {
    return this._cursor;
  }

  get done(): boolean {
    return !this._cursor || this._cursor === '0';
  }
}

class ZSetIterator extends AbstractIterator {
  constructor(queue: Queue, private _key: string, config: TIteratorConfig) {
    super(queue, config);
  }

  async *generator() {
    const client = await this._queue.client;
    let ids: string[] = [];
    let cursor: string | number;

    do {
      if (this._pattern) {
        [cursor, ids] = await client.zscan(
          this._key,
          this._cursor,
          'COUNT',
          this._scanCount,
          'MATCH',
          this._pattern,
        );
      } else {
        [cursor, ids] = await client.zscan(
          this._key,
          this._cursor,
          'COUNT',
          this._scanCount,
        );
      }

      this._cursor = cursor ? this._cursor.toString() : '';

      const res = (ids as string[]).filter((_k: string, idx) => !(idx % 2));
      let filteredIds: string[] = [];
      res.forEach((id) => {
        if (!this._seen.has(id)) {
          filteredIds.push(id);
          this._seen.add(id);
        }
      });

      if (this._filterFn && filteredIds.length) {
        filteredIds = await this._filterFn(this._queue, filteredIds);
      }

      if (filteredIds.length) {
        yield filteredIds;
      }
    } while (!this.done);
  }
}

// exported for testing
export class KeyspaceIterator extends AbstractIterator {
  private _match: string;
  private _keyPrefix: string;

  constructor(queue: Queue, prefix: string, config: TIteratorConfig) {
    super(queue, config);
    // job keys are prefix:queue-name:<jobId> e.g. bull:send-mail:new-user-1
    // queueKeyPrefix here would be 'bull:send-mail:'
    // find prefix by locating last colon
    this._keyPrefix = ensureEndsWith(prefix || this._queue.toKey(''), ':');
    this._match = this._keyPrefix + (config.pattern || '*');
  }

  private extractId(key: string): string {
    return extractJobIdFromKey(key, this._keyPrefix);
  }

  async *generator() {
    const client = await this._queue.client;
    this._seen.clear();

    // todo: use "type" option when redis >= 6.0.0
    // typing here is wrong, so TS gives a warning
    // const useType = semver.ge(this._queue.redisVersion, '6.0.0');
    do {
      const [cursor, ids] = await client.scan(
        this._cursor,
        'MATCH',
        this._match,
        'COUNT',
        this._scanCount
      );

      this._cursor = cursor ? this._cursor.toString() : '0';

      let filteredIds: string[] = [];
      (ids as string[]).forEach((id) => {
        const key = this.extractId(id);
        if (key && !this._seen.has(key)) {
          filteredIds.push(key);
          this._seen.add(key);
        }
      });

      if (this._filterFn && filteredIds.length) {
        filteredIds = await this._filterFn(this._queue, filteredIds);
      }

      if (filteredIds.length) {
        yield filteredIds;
      }

    } while (!this.done);
  }
}

export class StaticListIterator extends AbstractIterator {
  private _index = 0;
  constructor(queue: Queue, private _ids: string[], config: TIteratorConfig) {
    super(queue, config);
  }

  async *generator() {
    this._index = 0;
    if (this._ids.length === 0) {
      return;
    }
    do {
      try {
        const ids = this._nextChunk;
        if (ids.length === 0) {
          this._cursor = null;
          return;
        }

        let filteredIds = this.filterIdsByPattern(ids);
        if (this._filterFn && filteredIds.length) {
          filteredIds = await this._filterFn(this._queue, ids);
        }

        this._incCursor(ids.length);
        if (filteredIds.length) {
          yield filteredIds;
        }
      } catch (e) {
        console.error(e);
        return;
      }
    } while (this._index < this._ids.length);
  }

  private _incCursor(n: number) {
    this._index += n;
    if (this._index >= this._ids.length) {
      this._cursor = null;
    } else {
      this._cursor = this._index.toString();
    }
  }

  private get _nextChunk() {
    return this._ids.slice(this._index, this._index + this._scanCount);
  }
}

class ListIterator extends AbstractIterator {
  private _match: string;

  constructor(queue: Queue, protected _key: string, config: TIteratorConfig) {
    super(queue, config);
    this._match = ensureEndsWith(_key, ':') + (config.pattern || '*');
  }

  async *generator() {
    const client = await this._queue.client;
    // attempt a fast path
    const count = await client.llen(this._key);
    if (count < Math.max(this._scanCount * 10, 250)) {
      // todo: make this configurable
      if (count === 0) {
        return;
      }
      const ids = await client.lrange(this._key, 0, -1);
      // we could have had shenanigans in the interim
      if (ids.length === 0) {
        return;
      }
      const staticIterator = new StaticListIterator(this._queue, ids, {
        pattern: this._pattern,
        scanCount: this._scanCount,
        filter: this._filterFn,
      });

      return staticIterator.generator();
    }

    const keyspaceIterator = new KeyspaceIterator(this._queue, this._key, {
      pattern: this._pattern,
      scanCount: this._scanCount,
      filter: this._filterFn,
    });
    return keyspaceIterator.generator();
  }
}

function nullFilter(queue: Queue, ids: string[]) {
  return ids;
}

export function createExpressionFilter(
  queue: Queue,
  expression: string,
): FilterFn {
  if (!expression) {
    return nullFilter;
  }
  let result = expressionCache.get(expression);
  if (result) {
    const ast: Maybe<Expression> = ExprEval.parse(expression);
    if (!ast) {
      throw new Error(`Invalid expression: ${expression}`);
    }
    const identifiers = new Set<string>();
    collectExpressionIdentifiers(ast, identifiers);
    const fields = getFieldsToFetch(identifiers);

    result = async (queue: Queue, ids: string[]): Promise<string[]> => {
      if (!ids.length) {
        return [];
      }
      const jobs = await extractJobsData(queue, ids, fields, ast);
      return jobs.map((x) => x.id);
    };

    expressionCache.set(expression, result);
  }
  return result;
}

function getScanCount(): number {
  return getConfigNumeric('DATA_SEARCH_SCAN_COUNT', 500);
}

function extractJobIdFromKey(key: string, prefix?: string): string {
  let id: string;
  if (prefix) {
    id = key.substring(prefix.length + 1);
    if (id.includes(':')) {
      return '';
    }
  } else {
    id = key.substring(key.lastIndexOf(':') + 1);
  }
  return SPECIAL_KEYS.has(id) ? '' : id;
}

function ensureEndsWith(str: string, suffix: string): string {
  return str.endsWith(suffix) ? str : str + suffix;
}
