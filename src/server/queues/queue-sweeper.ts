import ms from 'ms';
import boom from '@hapi/boom';
import { getValue } from '../config';
import { isNumber, logger } from '../lib';
import { QueueConfig } from '../../types';
import PQueue from 'p-queue';
import Timeout = NodeJS.Timeout;
import { QueueManager } from './queue-manager';

const TIMER_INTERVAL = ms('1 hour');
const UNITS = ['minutes', 'hours', 'days', 'weeks'];

// TEMP
const DEFAULT_RETENTION = ms('10 weeks');

function getRetention(): number {
  const baseValue = getValue('retention');
  if (baseValue) {
    if (isNumber(baseValue)) {
      return parseInt(baseValue);
    }
    const result = ms(baseValue);
    if (!result) {
      throw boom.internal(
        'Invalid value for retention. Val = ' + JSON.stringify(baseValue),
      );
    }
    return parseInt(result);
  }

  return DEFAULT_RETENTION;
}

/** Handles interval cleanup duties for a queue */
export class QueueSweeper {
  private _done: boolean;
  private readonly retention: number;
  private interval: Timeout;
  private readonly manager: any;
  private readonly _workQueue: PQueue;
  private readonly queueConfig: QueueConfig;

  constructor(manager: QueueManager, workQueue: PQueue) {
    this._done = false;
    this.manager = manager;
    this.queueConfig = manager.config;
    this.interval = setInterval(() => this.run(), TIMER_INTERVAL);
    this.retention = getRetention();
    this._workQueue = workQueue;
  }

  destroy(): void {
    this._done = true;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  get hasLock(): boolean {
    return this.manager.hasLock;
  }

  getJobTypes(): string[] {
    const config = this.queueConfig;
    return config && config.jobTypes && Array.isArray(config.jobTypes)
      ? config.jobTypes
      : [];
  }

  private async cleanupAlerts(): Promise<number> {
    return this.manager.ruleManager.pruneAlerts(this.retention);
  }

  private onError(err): void {
    logger.warn(err);
  }

  private _cleanup(unit: string): void {
    const { statsClient } = this.manager;
    const types = ['latency', 'wait'];

    const statsCleanup = (jobType: string, type: string, unit) => {
      this._workQueue
        .add(() => statsClient.cleanup(jobType, type, unit, this.retention))
        .catch((err) => this.onError(err));
    };

    types.forEach((type) => statsCleanup(null, type, unit));
    this.getJobTypes().forEach((jobType) => {
      types.forEach((type) => statsCleanup(jobType, type, unit));
    });
  }

  async run(): Promise<void> {
    if (this._done) return;
    if (this.hasLock) {
      this._workQueue
        .addAll([() => this.cleanupAlerts(), () => this.manager.bus.cleanup()])
        .catch((err) => this.onError(err));
      UNITS.forEach((unit) => this._cleanup(unit));
    }
  }
}
