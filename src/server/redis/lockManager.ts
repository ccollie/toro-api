import ms from 'ms';
import os from 'os';
import crypto from 'crypto';
import * as IORedis from 'ioredis';
import { EventEmitter } from 'events';
import config from '../config';
import { getLockKey } from '../monitor/keys';
import { createDebug } from '../lib/debug';
import {
  KeyspaceNotification,
  KeyspaceNotificationType,
  KeyspaceNotifier,
} from '../redis';

const debug = createDebug('locks');
const DEFAULT_LOCK_TTL = ms('45 secs'); // todo: get from config

function genToken(): string {
  const rand = crypto.randomBytes(8).toString('hex');
  return [os.hostname(), global.process.pid, rand].join('-');
}

/**
 * Class to maintain a distributed redlock to control writing to the db
 */
export class LockManager extends EventEmitter {
  private readonly host: string;
  private readonly client: IORedis.Redis;
  private readonly keyspaceNotifier: KeyspaceNotifier;
  public readonly lockKey: string;
  private readonly token: string;
  private lockTimer: NodeJS.Timeout | null;
  private _isLocked = false;
  private _unmonitorKey: Function;
  private readonly lockTTL: number;

  constructor(
    client: IORedis.Redis,
    notifier: KeyspaceNotifier,
    host: string,
    lockTTL?: number,
  ) {
    super();
    this.host = host;
    this.client = client;
    this.keyspaceNotifier = notifier;
    this.lockTTL = parseInt(
      lockTTL || config.get('lockTTL') || DEFAULT_LOCK_TTL,
    );
    this.lockKey = getLockKey(host);
    this.token = genToken();
    this.lockTimer = null;
  }

  destroy(): Promise<void> {
    return this.stop();
  }

  get isLocked(): boolean {
    return !!this._isLocked;
  }

  get isStarted(): boolean {
    return !!this.lockTimer;
  }

  async start(): Promise<boolean> {
    if (!this.lockTimer) {
      await this._monitorKey();
      await this._lockCall('acquire');
      const renewTime = Math.floor(this.lockTTL * 0.65);
      this.lockTimer = setInterval(() => this.checkLockStatus(), renewTime);
    }
    return this._isLocked;
  }

  private async _monitorKey(): Promise<void> {
    this._unmonitorKey = await this.keyspaceNotifier.subscribe(
      KeyspaceNotificationType.KEYSPACE,
      this.lockKey,
      (msg: KeyspaceNotification) => {
        if (this.isStarted && ['expire', 'del'].includes(msg.event)) {
          this._isLocked = false;
          return this.checkLockStatus();
        }
      },
    );
  }

  async stop(): Promise<void> {
    if (this.lockTimer) {
      clearTimeout(this.lockTimer);
      this.lockTimer = null;
    }
    if (this._unmonitorKey) {
      this._unmonitorKey();
      this._unmonitorKey = null;
    }
    return this.remove();
  }

  async remove(): Promise<void> {
    const released = await (this.client as any).locks(
      this.lockKey,
      'release',
      this.token,
    );
    this._isLocked = false;
    if (!!released) {
      debug('Released lock %s (token: %s)', this.lockKey, this.token);
      this.emit('lock:released', this.host, this);
    }
  }

  async acquire(): Promise<boolean> {
    await this.start();
    const wasLocked = this.isLocked;
    this._isLocked = await this._lockCall('acquire');
    if (!wasLocked && this.isLocked) {
      debug('Acquired lock %s (token: %s)', this.lockKey, this.token);
      this.emit('lock:acquired', this.host, this);
    }
    return this.isLocked;
  }

  async extend(): Promise<boolean> {
    await this.start();
    const locked = await this._lockCall('extend');
    if (locked) {
      debug('Extended lock %s (token: %s)', this.lockKey, this.token);
      this.emit('lock:extended', this.host, this);
    }
    return locked;
  }

  async checkLockStatus(): Promise<boolean> {
    return this._isLocked ? this.extend() : this.acquire();
  }

  private async _lockCall(method: string): Promise<boolean> {
    const locked = await (this.client as any).locks(
      this.lockKey,
      method,
      this.token,
      this.lockTTL,
    );
    return (this._isLocked = !!locked);
  }
}
