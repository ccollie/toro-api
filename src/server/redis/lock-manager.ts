// Based on https://github.com/bluerivers/redlock-coordinator
import * as IORedis from 'ioredis';
import { EventEmitter } from 'events';
import config from '../config';
import logger from '../lib/logger';
import { createDebug } from '../lib';
import RedLock from 'redlock';
import Timeout = NodeJS.Timeout;

export interface LockOptions {
  key: string;
  ttl?: number;
  renew?: number;
  wait?: number;
  redlock: {
    driftFactor?: number;
    retryCount?: number;
    retryDelay?: number;
    retryJitter?: number;
  };
}

export const DEFAULT_LOCK_KEY = 'toro:writer';

const defaultOption: Partial<LockOptions> = {
  key: DEFAULT_LOCK_KEY,
  ttl: 10000,
  renew: 5000,
  wait: 1000,
  redlock: {
    driftFactor: 0.01,
    retryCount: 10,
    retryDelay: 200,
    retryJitter: 200,
  },
};

function getDefaultTTL(): number {
  const defaultValue = 10000;
  const ttl = config.get('lockTTL'); // todo: get from config
  if (typeof ttl === 'string') {
    const value = parseInt(ttl, 10);
    return isNaN(value) ? defaultValue : value;
  }
  return defaultValue;
}

const LockManagerEvent = {
  ACQUIRED: 'elected',
  RELEASED: 'released',
  ERROR: 'lock-error',
};

/**
 * Class to maintain a distributed redlock to control writing to the db
 */
export class LockManager extends EventEmitter {
  private readonly client: IORedis.Redis;
  private readonly redLock: RedLock;
  public readonly key: string;
  public readonly ttl: number;
  public readonly waitTime: number;
  public readonly renewTime: number;
  private lock: any;
  private renewId: Timeout = null;
  private electId: Timeout = null;

  constructor(client: IORedis.Redis, options?: Partial<LockOptions>) {
    super();
    this.client = client;

    const opts = Object.assign(
      { ttl: getDefaultTTL() },
      options || {},
      defaultOption,
    );

    const {
      key = defaultOption.key,
      ttl = defaultOption.ttl,
      wait = defaultOption.wait,
      renew = defaultOption.renew,
    } = opts;

    const redlockOptions = opts.redlock || defaultOption.redlock;

    this.key = key;
    this.ttl = ttl;
    this.waitTime = wait;
    this.renewTime = renew;

    this.stop = this.stop.bind(this);

    this.redLock = new RedLock([this.client], redlockOptions).on(
      'clientError',
      (error) => {
        logger.error('A redis error has occurred - err: %O', error);
        throw error;
      },
    );

    this.lock = null;
  }

  destroy(): Promise<void> {
    return this.stop();
  }

  get isStarted(): boolean {
    return !!this.electId || !!this.renewId;
  }

  get isOwner(): boolean {
    return !!this.lock;
  }

  async start(): Promise<boolean> {
    if (!this.isStarted) {
      await this.acquire();
    }
    return this.isOwner;
  }

  async stop(): Promise<void> {
    if (this.isStarted) {
      this.emit('lock:stopped', this);
      await this.release();
    }
  }

  async acquire(): Promise<boolean> {
    if (this.isOwner) return true;
    try {
      this.lock = await this.redLock.lock(this.key, this.ttl);

      logger.info(
        '[acquire] Acquired lock - value: %s, expiration time: %s',
        this.lock.value,
        new Date(this.lock.expiration),
      );

      this.renewId = setInterval(() => this.renew(), this.renewTime);
      this.emit(LockManagerEvent.ACQUIRED);
    } catch (error) {
      this.lock = null;
      if (error.name === 'LockError') {
        logger.debug('[acquire] not the owner');
      } else {
        logger.error('[acquire] error occurred - error: %O', error);
        this.emit(LockManagerEvent.ERROR, error);
      }
      this.electId = setTimeout(() => this.acquire(), this.waitTime);
    }
    return this.isOwner;
  }

  async renew(): Promise<boolean> {
    if (this.isOwner) {
      logger.debug('[renew] coordinator extends expiration');
      try {
        this.lock = await this.lock.extend(this.ttl);
      } catch (error) {
        const expired = /the lock has already expired/.test(error.message);
        if (expired) {
          logger.debug('[renew] lock expired');
        } else {
          logger.error('[renew] extend FAILED - error: %O', error);
        }

        clearInterval(this.renewId);
        this.renewId = null;

        try {
          this.emit(LockManagerEvent.ERROR, error);
        } catch {}

        if (!expired) {
          try {
            await this.lock.unlock();
          } catch (error) {
            logger.warn('[renew] unlock FAILED - error: %O', error);
          }
        }

        this.lock = null;
        this.emit(LockManagerEvent.RELEASED);

        logger.error('[renew] Attempting to acquire');
        this.electId = setTimeout(() => this.acquire(), this.waitTime);
      }
    } else {
      logger.debug('[renew] non-owner reset renew interval');
      clearInterval(this.renewId);
      this.renewId = null;
      this.electId = setTimeout(() => this.acquire(), this.waitTime);
    }
    return this.isOwner;
  }

  async release(): Promise<void> {
    logger.info('[release] start release');

    clearInterval(this.renewId);
    clearTimeout(this.electId);
    this.renewId = null;
    this.electId = null;

    if (this.isOwner) {
      try {
        await this.lock.unlock();

        logger.info('[release] release complete');
        this.emit(LockManagerEvent.RELEASED);
      } catch (error) {
        logger.error('[release] unlock FAILED - error: %O', error);
        this.emit(LockManagerEvent.ERROR, error);
      }
    }

    this.lock = null;
  }

  async checkLockStatus(): Promise<boolean> {
    return this.isOwner ? this.renew() : this.acquire();
  }
}
