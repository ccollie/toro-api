import ms from 'ms';
import boom from '@hapi/boom';
import pMap from 'p-map';
import pSettle from 'p-settle';
import config from '../../config';
import { accurateInterval, isNumber } from '../../lib';
import { QueueConfig } from '@src/types';

const TIMER_INTERVAL = ms('1 hour');
const UNITS = ['minutes', 'hours', 'days', 'weeks'];

// TEMP
const DEFAULT_RETENTION = ms('10 weeks');

function getRetention(): number {
  const baseValue = config.getValue('retention');
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
    return result;
  }

  return DEFAULT_RETENTION;
}

// todo: rules and event bus

/** Handles period cleanup duties for a queue */
export class QueueSweeper {
  private _done: boolean;
  private readonly retention: number;
  private interval: { clear: () => void };
  private readonly manager: any;
  private readonly queueConfig: QueueConfig;

  constructor(manager, queueConfig: QueueConfig) {
    this._done = false;
    this.manager = manager;
    this.queueConfig = queueConfig;
    this.interval = accurateInterval(() => this.run(), TIMER_INTERVAL);
    this.retention = getRetention();
  }

  destroy(): void {
    this._done = true;
    this.interval.clear();
  }

  get hasLock(): boolean {
    return this.manager.hasLock;
  }

  getJobTypes() {
    const config = this.queueConfig;
    return config && config.jobTypes && Array.isArray(config.jobTypes)
      ? config.jobTypes
      : [];
  }

  private async _cleanup(unit: string): Promise<void> {
    const { alertClient, statsClient } = this.manager;
    const types = ['latency', 'wait'];

    const statsCleanup = (jobType, type, unit) => {
      statsClient.cleanup(jobType, type, unit, this.retention);
    };

    types.forEach((type) => statsCleanup(null, type, unit));
    this.getJobTypes().forEach((jobType) => {
      types.forEach((type) => statsCleanup(jobType, type, unit));
    });

    const calls = this.manager.rules.map((rule) => () =>
      alertClient.clean(rule, this.retention),
    );
    calls.push(() => this.manager.bus.cleanup());

    const res = await pSettle(calls, { concurrency: 4 });
    // todo: log failures
    res.forEach((value) => {
      if (value.isRejected) {
        console.log('Failed cleaning');
      }
    });
  }

  async run(): Promise<void> {
    if (this._done) return;
    if (this.hasLock) {
      await pMap(UNITS, (unit) => this._cleanup(unit)).catch((err) => {
        console.log(err);
      });
    }
  }
}
