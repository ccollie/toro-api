import IORedis, { Redis, Pipeline } from 'ioredis';
import { isObject, isEmpty } from 'lodash';

import logger from '../lib/logger';
import config from '../config';
import * as streams from './streams';
import { isNumber } from '../lib/utils';
import { systemClock } from '../lib/clock';
import { LockManager } from './lock-manager';

const LAST_CALL = Symbol('last call');
const POLL_TIMER = Symbol('poll timer');
const CACHE_WRITE_LOCK = Symbol('write lock');
const DEREGISTER_TIMEOUT = 10 * 1000;

function incrementValues(
  buffer: Record<string, Record<string, number>>,
  key: string,
  update: Record<string, number>,
): void {
  const temp = (buffer[key] = buffer[key] || {});
  Object.entries(update).forEach(([k, v]) => {
    temp[k] = (temp[k] || 0) + v;
  });
}

/**
 * This class exists to buffer calls to redis made within a
 * given interval and sendMail them within a single pipeline. It
 * also collapses certain calls (e.g. hincr) to further reduce
 * bandwidth
 */
export class WriteCache {
  private _isFlushing: boolean;
  public readonly client: Redis;
  private readonly flushInterval: number;
  private pendingMulti: Pipeline | null = null;
  private timer: NodeJS.Timeout = null;
  private _changed: boolean;
  private buffer: {
    zset: Map<string, any[]>;
    set: Record<string, any>;
    incr: Record<string, number>;
    tsAdd: Record<string, any>;
    hincr: Record<string, Record<string, number>>;
    del: string[];
    hset: Record<symbol, any>;
  };

  /**
   * Constructs a {@link WriteCache}
   * @param {Redis} client a redis client
   * @param {LockManager} lockMgr
   * @param {Number} interval
   */
  constructor(client: Redis, lockMgr: LockManager, interval?: number) {
    this.timer = null;
    this._isFlushing = false;
    this._changed = false;
    this.client = client;
    this.buffer = {
      zset: new Map<string, any[]>(),
      set: {},
      incr: {},
      tsAdd: {},
      hincr: {},
      hset: {},
      del: [],
    };
    this.flush.bind(this);
    this[LAST_CALL] = systemClock.getTime();
    this[POLL_TIMER] = null;
    this[CACHE_WRITE_LOCK] = lockMgr;
    this.flushInterval = isNumber(interval)
      ? interval
      : parseInt(config.get('flushInterval') || 1000);
  }

  /**
   * Does this instance have an exclusive lock
   * @returns {Boolean}
   */
  get hasLock(): boolean {
    return this[CACHE_WRITE_LOCK].isOwner;
  }

  get multi(): Pipeline {
    return this.pendingMulti || (this.pendingMulti = this.client.multi());
  }

  get isChanged(): boolean {
    return this._changed;
  }

  poll(): void {
    if (!this[POLL_TIMER]) {
      const pollTimer = setInterval(() => this.flush(), this.flushInterval);
      pollTimer.unref();
      this[POLL_TIMER] = pollTimer;
    }
  }

  unpoll(): void {
    if (this[POLL_TIMER]) {
      clearInterval(this[POLL_TIMER]);
      this[POLL_TIMER] = null;
    }
  }

  destroy(): void {
    this.unpoll();
  }

  /**
   * @private
   * @param multi
   */
  private processBuffer(multi: IORedis.Pipeline): void {
    function handleDel(keys: string[]): void {
      if (keys.length) {
        multi.del(...keys);
      }
    }

    function handleHIncr(data = {}): void {
      for (const [key, update] of Object.entries(data)) {
        for (const [field, value] of Object.entries(update)) {
          value && multi.hincrby(key, field, value);
        }
      }
    }

    function handleHSet(data: Record<string, any> = {}): void {
      if (isEmpty(data)) {
        return;
      }
      for (const [key, update] of Object.entries(data)) {
        multi.hmset(key, update);
      }
    }

    function handleIncr(data: Record<string, number> = {}): void {
      for (const [key, value] of Object.entries(data)) {
        value && multi.incrby(key, value);
      }
    }

    function handleTsAdd(data = {}): void {
      Object.keys(data).forEach((key) => {
        const items = data[key];
        // todo: sort by timestamp
        items.forEach((val) => {
          const { key, data, _ts } = val;
          streams.add(multi, key, _ts, data);
        });
      });
    }

    function handleSet(data = {}): void {
      const args = Object.entries(data).reduce((res, [key, val]) => {
        res.push(key, val);
        return res;
      }, []);
      args.length && multi.mset(...args);
    }

    function handleZSet(data: Map<string, any[]>): void {
      Object.entries(data).forEach(([key, values]) => {
        multi.zadd(key, ...values);
      });
    }

    if (this._changed) {
      handleDel(this.buffer.del);
      handleIncr(this.buffer.incr);
      handleTsAdd(this.buffer.tsAdd);
      handleSet(this.buffer.set);
      handleZSet(this.buffer.zset);
      handleHSet(this.buffer.hset);
      handleHIncr(this.buffer.hincr);
    }
  }

  private _clearBuffer(): void {
    this.buffer.hincr = Object.create(null);
    this.buffer.hset = Object.create(null);
    this.buffer.incr = Object.create(null);
    this.buffer.tsAdd = Object.create(null);
    this.buffer.set = Object.create(null);
    this.buffer.del = [];
    if (!this.buffer.zset) {
      this.buffer.zset = new Map<string, any[]>();
    }
    this.buffer.zset.clear();
    this._changed = false;
  }

  del(...keys: string[]): void {
    this.buffer.del.push(...keys);
  }

  incr(key: string, value: number): void {
    this.buffer.incr[key] = (this.buffer.incr[key] || 0) + value;
    this._changed = true;
  }

  hincr(key: string, update: Record<string, number>): void {
    incrementValues(this.buffer.hincr, key, update);
    this._changed = true;
  }

  hmset(key: string, update: Record<string, any>): void {
    const existing = this.buffer.hset[key] || {};
    this.buffer.hset[key] = { ...existing, ...update };
    this._changed = true;
  }

  hset(key: string, field: string, value: any): void {
    this.hmset(key, { [field]: value });
    this._changed = true;
  }

  tsAdd(key: string, timestamp: string | number, data): void {
    this.buffer.tsAdd[key] = this.buffer.tsAdd[key] || [];
    const temp = this.buffer.tsAdd[key];
    temp.push({ key, timestamp, data });
    this._changed = true;
  }
  set(key: string, value: any): void {
    this.buffer.set[key] = value;
    this._changed = true;
  }

  zset(key: string, score: number, value): void {
    let entry = this.buffer.zset.get(key);
    if (!entry) {
      entry = [];
      this.buffer.zset.set(key, entry);
    }
    if (isObject(value)) {
      value = JSON.stringify(value);
    }
    entry.push(score, value);
    this._changed = true;
  }

  discardBuffer(): void {
    this.pendingMulti = null;
    this._clearBuffer();
  }

  async flush(): Promise<void> {
    if (this._isFlushing) return;
    this._isFlushing = true;

    if (!this.hasLock) {
      this.discardBuffer();
      return;
    }

    let current,
      len = 0;
    if (this._changed) {
      current = this.multi;
      this.pendingMulti = null;
      this.processBuffer(current);
      this._clearBuffer();
      len = current.length;
    }

    if (!len) {
      this._isFlushing = false;
      return;
    }

    try {
      const res = await current.exec();
      res.forEach(([err]) => {
        if (err) console.log(err);
      });
    } catch (err) {
      logger.error('Error flushing pending updates ', { err });
    } finally {
      this._isFlushing = false;
      const now = systemClock.getTime();
      if (now - this[LAST_CALL] > DEREGISTER_TIMEOUT) {
        this.unpoll();
      }
      this[LAST_CALL] = now;
    }
  }
}
