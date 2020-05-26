import { Redis, Pipeline } from 'ioredis';
import { isObject, isEmpty } from 'lodash';

import logger from '../lib/logger';
import config from '../config';
import * as streams from './streams';
import { isNumber, diff } from '../lib/utils';
import { systemClock } from '../lib/clock';
import { LockManager } from '../monitor/lib';
import { isValidDate } from '../lib/datetime';
import { parseObjectResponse } from './utils';

const LAST_CALL = Symbol('last call');
const POLL_TIMER = Symbol('poll timer');
const CACHE_WRITE_LOCK = Symbol('write lock');
const DEREGISTER_TIMEOUT = 10 * 1000;

function incrementValues(buffer, key, update): void {
  const temp = (buffer[key] = buffer[key] || {});
  Object.entries(update).forEach(([k, v]) => {
    temp[k] = (temp[k] || 0) + v;
  });
}

function toTimestamp(val): number {
  if (isValidDate(val)) {
    return val.getTime();
  }
  return parseInt(val);
}

function sortStreamEntries(data = []) {
  const now = systemClock.now();

  function convertTs(ts): number {
    if (!ts || ts === '*') return now;
    return toTimestamp(ts);
  }

  function streamSortComparator(a, b): number {
    const ts1 = a._ts;
    const ts2 = b._ts;
    return ts1 === ts2 ? 0 : ts1 > ts2 ? 1 : 0;
  }

  const items = data
    .map((x) => {
      x._ts = convertTs(x.timestamp);
      return x;
    })
    .sort(streamSortComparator);

  let prevTs = null;
  const dupes = {};

  items.forEach((val) => {
    const timestamp = val.timestamp;
    // make sure we don't have duplicate timestamps
    if (prevTs === timestamp && timestamp !== '*') {
      if (Number.isInteger(timestamp)) {
        dupes[timestamp] = (dupes[timestamp] || 0) + 1;
        val._ts = `${timestamp}-${dupes[timestamp]}`;
      }
    }
    prevTs = timestamp;
  });

  return items;
}

/****
 * This class exists to buffer calls to redis made within a
 * given interval and send them within a single pipeline. It
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
    zset: {};
    set: {};
    incr: {};
    tsAdd: {};
    hincr: {};
    del: any[];
    hset: {};
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
    this._clearBuffer();
    this.flush.bind(this);
    this[LAST_CALL] = systemClock.now();
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
    return this[CACHE_WRITE_LOCK].isLocked;
  }

  get multi(): Pipeline {
    return this.pendingMulti || (this.pendingMulti = this.client.multi());
  }

  get isChanged() {
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
  private processBuffer(multi): void {
    function handleDel(keys): void {
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

    function handleHSet(data = {}): void {
      if (isEmpty(data)) {
        return;
      }
      for (const [key, update] of Object.entries(data)) {
        multi.hmset(key, update);
      }
    }

    function handleIncr(data = {}): void {
      for (const [key, value] of Object.entries(data)) {
        value && multi.incrby(key, value);
      }
    }

    function handleTsAdd(data = {}): void {
      Object.keys(data).forEach((key) => {
        const items = sortStreamEntries(data[key]);
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

    function handleZSet(data = {}): void {
      Object.entries(data).forEach(([key, values]) => {
        // @ts-ignore
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
    this.buffer = {
      hincr: {},
      hset: {},
      incr: {},
      tsAdd: {},
      set: {},
      zset: {},
      del: [],
    };
    this._changed = false;
  }

  del(...keys): void {
    this.buffer.del.push(...keys);
  }

  incr(key, value): void {
    this.buffer.incr[key] = (this.buffer.incr[key] || 0) + value;
    this._changed = true;
  }

  hincr(key, update): void {
    incrementValues(this.buffer.hincr, key, update);
    this._changed = true;
  }

  hmset(key, update): void {
    const existing = this.buffer.hset[key] || {};
    this.buffer.hset[key] = { ...existing, ...update };
    this._changed = true;
  }

  hset(key, field, value): void {
    this.hmset(key, { [field]: value });
    this._changed = true;
  }

  tsAdd(key, timestamp, data): void {
    this.buffer.tsAdd[key] = this.buffer.tsAdd[key] || [];
    const temp = this.buffer.tsAdd[key];
    temp.push({ key, timestamp, data });
    this._changed = true;
  }

  writeStreamData(key, ts, data): void {
    if (this.hasLock) {
      this.tsAdd(key, ts || '*', data);
    }
  }

  set(key, value): void {
    this.buffer.set[key] = value;
    this._changed = true;
  }

  zset(key, score, value): void {
    let entry = this.buffer.zset[key];
    if (!entry) {
      entry = [];
      this.buffer.zset[key] = entry;
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
      res.forEach(([err, resp], index) => {
        if (err) {
          const q = current._queue;
          const command = q[index];
          if (command.name === 'xadd') {
            const [key, ts, ...rest] = command.args;
            const currentData = parseObjectResponse(rest);
            return streams.getLast(this.client, key).then(({ id, data }) => {
              console.log(`error with xadd ${key}`);
              console.log(`current id ${ts} : ${new Date(parseInt(ts))}`);
              console.log(
                `old id ${id} : ${new Date(streams.timestampFromStreamId(id))}`,
              );
              const difference = diff(data, currentData);
              console.log(difference);
              // console.log(currentData)
            });
          } else {
            console.log(err);
          }
        }
      });
    } catch (err) {
      logger.error('Error flushing pending updates ', { err });
    } finally {
      this._isFlushing = false;
      const now = systemClock.now();
      if (now - this[LAST_CALL] > DEREGISTER_TIMEOUT) {
        this.unpoll();
      }
      this[LAST_CALL] = now;
    }
  }
}
