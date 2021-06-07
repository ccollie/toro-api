// Based on https://github.com/bluerivers/redlock-coordinator
import { EventEmitter } from 'events';
import logger from '../lib/logger';
import RedLock from 'redlock';
import { parseDuration } from '@lib/datetime';
import { RedisClient } from 'bullmq';
import { setTimeout, setInterval } from 'timers';

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

const DEFAULT_LOCK_TTL = 10000;
export const DEFAULT_LOCK_KEY = 'toro:writer';

const defaultOption: Partial<LockOptions> = {
  key: DEFAULT_LOCK_KEY,
  ttl: 10000,
  renew: 8000,
  wait: 1000,
  redlock: {
    driftFactor: 0.01,
    retryCount: 10,
    retryDelay: 200,
    retryJitter: 200,
  },
};

function getLockTTL(): number {
  return parseDuration(process.env.LOCK_TTL, DEFAULT_LOCK_TTL);
}

type TTimeout = ReturnType<typeof setTimeout>;
type TInterval = ReturnType<typeof setInterval>;

/**
 * Class to maintain a distributed redlock to control writing to the db
 */
export class LockManager extends EventEmitter {
  private readonly client: RedisClient;
  private readonly redLock: RedLock;
  public readonly key: string;
  public readonly ttl: number;
  public readonly waitTime: number;
  public readonly renewTime: number;
  private lock: any;
  private renewId: TInterval = null;
  private electId: TTimeout = null;

  static ACQUIRED = 'elected';
  static RELEASED = 'released';
  static ERROR = 'lock-error';
  static STATE_CHANGED = 'state-changed';

  constructor(client: RedisClient, options?: Partial<LockOptions>) {
    super();
    this.client = client;

    const opts = Object.assign(
      { ttl: getLockTTL() },
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
    return !!this.lock || !!this.electId || !!this.renewId;
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
    this.clearTimers();
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

      // console.log('Lock acquired: ' + this.key);
      this.clearTimers();
      this.renewId = setInterval(
        () => this.renew(),
        this.renewTime,
      ) as TInterval;
      this.emit(LockManager.ACQUIRED, this);
      this.emit(LockManager.STATE_CHANGED, this.isOwner);
    } catch (error) {
      this.lock = null;
      if (error.name === 'LockError') {
        logger.debug('[acquire] not the owner');
      } else {
        logger.error('[acquire] error occurred - error: %O', error);
        this.emit(LockManager.ERROR, error);
      }
      this.clearTimers();
      this.setElectTimeout();
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

        try {
          this.emit(LockManager.ERROR, error);
        } catch {}

        this.clearTimers();

        if (!expired) {
          try {
            await this.lock.unlock();
          } catch (error) {
            logger.warn('[renew] unlock FAILED - error: %O', error);
          }
        }

        this.lock = null;
        this.emit(LockManager.RELEASED, this);
        logger.error('[renew] Attempting to acquire');
        this.setElectTimeout();
      }
    } else {
      logger.debug('[renew] non-owner reset renew interval');
      this.clearTimers();
      this.setElectTimeout();
    }
    return this.isOwner;
  }

  async release(): Promise<void> {
    logger.info('[release] start release');

    this.clearTimers();

    if (this.isOwner) {
      try {
        await this.lock.unlock();

        logger.info('[release] release complete');
        this.emit(LockManager.RELEASED, this);
        this.emit(LockManager.STATE_CHANGED, this.isOwner);
      } catch (error) {
        logger.error('[release] unlock FAILED - error: %O', error);
        this.emit(LockManager.ERROR, error);
      }
    }

    this.lock = null;
  }

  private setElectTimeout() {
    this.electId = setTimeout(() => this.acquire(), this.waitTime);
  }

  private clearTimers() {
    if (this.renewId) {
      clearInterval(this.renewId);
      this.renewId = null;
    }
    if (this.electId) {
      clearInterval(this.electId);
      this.electId = null;
    }
  }

  async checkLockStatus(): Promise<boolean> {
    return this.isOwner ? this.renew() : this.acquire();
  }
}
