import { collectExpressionIdentifiers, Expression, ExprEval } from '@alpen/shared';
import { Queue } from 'bullmq';
import type { JobType } from 'bullmq';
import { extractJobsData, getFieldsToFetch } from './filter-utils';
import { getConfigNumeric } from '../lib/config-utils';
import type { Maybe } from '../types';

/// see https://github.com/taskforcesh/bullmq/blob/master/src/classes/queue-keys.ts
const SPECIAL_KEYS = new Set<string>([
  'active',
  'wait',
  'waiting',
  'waiting-children',
  'paused',
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
  'resumed',
  'meta',
  'events',
  'delay',
  'logs',
]);

type FilterFn = (keys: string[]) => string[] | Promise<string[]>;

type TKeyCursorIteratorArgs = {
  status?: JobType;
  cursor?: string;
  scanCount?: number;
  filter?: string;
};

export function getKeyCursorIterator(
  queue: Queue,
  args: TKeyCursorIteratorArgs,
): Maybe<AbstractIterator> {
  const redisKey = !args.status ? '' : queue.toKey(args.status);

  const filterFn: FilterFn = args.filter ? createExpressionFilter(queue, args.filter) : undefined;

  const config: TIteratorConfig = {
    cursor: args.cursor,
    scanCount: args.scanCount,
    filter: filterFn,
  };

  if (!redisKey) {
    return new ListIterator(queue, redisKey, config);
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
};

abstract class AbstractIterator {
  protected _scanCount: number;
  protected _cursor = '0';
  protected _seen: Set<string> = new Set();
  protected _filterFn: FilterFn;

  constructor(protected _queue: Queue, config: TIteratorConfig) {
    this._scanCount = config.scanCount || getScanCount();
    this._cursor = config.cursor || '0';
  }

  protected resetCursor() {
    this._cursor = '0';
    this._seen.clear();
  }

  abstract generator(): AsyncGenerator<string[]>;

  get cursor(): string {
    return this._cursor;
  }
}

class ZSetIterator extends AbstractIterator {
  constructor(queue: Queue, private _key: string, config: TIteratorConfig) {
    super(queue, config);
  }
  async *generator() {
    const client = await this._queue.client;
    do {
      // todo: pass in type Hash if we're redis > 6.0
      const [cursor, ids] = await client.zscan(
        this._cursor,
        'COUNT',
        this._scanCount,
      );
      this._cursor = cursor;

      const filteredIds = (ids as string[]).filter(
        (_k: string, idx) => !(idx % 2) && !this._seen.has(_k),
      );
      filteredIds.forEach((id) => this._seen.add(id));
      if (this._filterFn) {
        const ids = await this._filterFn(filteredIds);
        yield ids;
      } else {
        yield filteredIds;
      }
    } while (this._cursor !== '0');
  }
}

class ListIterator extends AbstractIterator {
  private _match: string;
  private _keyPrefix: string;
  private _basePrefix: string;

  constructor(queue: Queue, private _key: string, config: TIteratorConfig) {
    super(queue, config);
    // keys are prefix:queue-name:*
    // find prefix by locating last colon
    this._keyPrefix = _key ? _key : this._queue.toKey('');
    this._basePrefix = this._queue.toKey('');
    this._match = this._keyPrefix + '*';
  }

  private extractId(key: string): string {
    return key.substring(this._basePrefix.length + 1);
  }

  private filterIds(ids: string[]): string[] {
    const result: string[] = [];
    ids.forEach(
      (id) => {
        const val = this.extractId(id);
        if (!val.includes(':') && !SPECIAL_KEYS.has(val) && !this._seen.has(val)) {
          result.push(val);
          this._seen.add(val);
        }
      }
    );
    return result;
  }

  async *generator() {
    const client = await this._queue.client;
    do {
      // todo: pass in type if we're redis > 6.0
      const [cursor, ids] = await client.scan(
        this._cursor,
        'MATCH',
        this._match,
        'COUNT',
        this._scanCount,
      );
      this._cursor = cursor;

      const filteredIds = this.filterIds(ids as string[]);

      if (this._filterFn && filteredIds.length) {
        const ids = await this._filterFn(filteredIds);
        yield ids;
      } else {
        yield filteredIds;
      }

    } while (this._cursor !== '0');
  }
}

export function createExpressionFilter(queue: Queue, expression: string): FilterFn {
  const ast: Maybe<Expression> = ExprEval.parse(expression);
  if (!ast) {
    throw new Error(`Invalid expression: ${expression}`);
  }
  const identifiers = new Set<string>();
  collectExpressionIdentifiers(ast, identifiers);
  const fields = getFieldsToFetch(identifiers);

  return async (ids: string[]): Promise<string[]> => {
    const jobs = await extractJobsData(queue, ids, fields, ast);
    return jobs.map(x => x.id);
  };
}

function getScanCount(): number {
  return getConfigNumeric('DATA_SEARCH_SCAN_COUNT', 500);
}
