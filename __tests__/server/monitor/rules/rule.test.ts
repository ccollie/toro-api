'use strict';
import { random, defaultsDeep } from 'lodash';
import {
  createContext,
  createQueueListener,
  randomId,
  randomString,
} from './utils';
import { systemClock } from '@src/server/lib/clock';
import { Rule } from '@src/server/monitor/rules';
import { delay } from '../../utils';
import { QueueListener } from '@src/server/monitor/queues';

describe('Rule', () => {
  let queueListener: QueueListener;

  beforeEach(() => {
    queueListener = createQueueListener();
  });

  afterEach(() => {
    queueListener.destroy();
  });

  function createRule(options = {}): Rule {
    const opts = {
      name: 'Rule name ' + randomString(6),
      id: randomId(),
      condition: { name: 'metrics' },
      ...options,
    };
    return new Rule(opts);
  }

  describe('constructor()', () => {
    it('can be initialized with condition and name', () => {
      const condition = {
        wait: { $lte: 1000 },
      };
      const opts = {
        condition,
        name: 'testName',
      };
      const rule = createRule(opts);
      expect(rule.condition).toEqual(opts.condition);
      expect(rule.name).toBe(opts.name);
    });

    it('can be initialized with an empty condition', () => {
      let rule;
      expect(() => (rule = createRule({ condition: {} }))).not.toThrow();
      expect(rule.condition).toEqual({});
    });
  });

  describe('evaluation', () => {
    async function postJob(rule, data = {}) {
      const latency = random(10, 2000);
      const now = systemClock.now();

      const job = {
        finishedOn: now,
        processedOn: now - latency,
      };

      let eventData = {
        job,
        ts: now,
        latency,
        wait: random(0, 2000),
        success: true,
        failed: false,
        ...data,
      };

      eventData = defaultsDeep({}, eventData, data);
      const context = rule.query.context;
      context.queueListener.emit('job.finished', eventData);
      await delay(30);
    }

    describe('warmup', () => {
      beforeEach(async () => {
        jest.setTimeout(10000); // change timeout to 10 seconds
      });

      test('it should respect the warmup period', async () => {
        const timeout = 100;

        jest.useFakeTimers();

        const eventSpy = jest.fn();
        const rule = createRule({
          condition: {},
          options: {
            warmup: timeout,
          },
        });
        rule.start(queueListener);
        rule.on('alert.triggered', eventSpy);
        expect(rule.isWarmingUp).toBe(true);

        await postJob(rule);
        jest.advanceTimersByTime(100);
        expect(eventSpy).not.toHaveBeenCalled();

        jest.advanceTimersByTime(timeout);
        expect(rule.isWarmingUp).toBe(false);
        await postJob(rule);
        expect(eventSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('volumeThreshold', () => {
      test('it should not trigger if volume is below a threshold', async () => {
        const threshold = 5;

        const rule = createRule({
          condition: {},
          options: {
            volumeThreshold: threshold,
          },
        });

        const triggerSpy = jest.fn();
        rule.start(queueListener);
        rule.on('alert.triggered', triggerSpy);

        for (let i = 0; i < threshold - 1; i++) {
          await postJob(rule);
          expect(triggerSpy).not.toHaveBeenCalled();
        }

        await postJob(rule);
        expect(triggerSpy).toHaveBeenCalledTimes(1);
      });
    });

    describe('passing conditions', () => {
      test('evaluates truthy when there are no conditions', async () => {
        const eventSpy = jest.fn();
        const rule = createRule({ condition: {} });
        rule.start(queueListener);
        rule.on('pass', eventSpy);
        await postJob(rule);
        expect(eventSpy).toHaveBeenCalledTimes(1);
      });

      test('emits "pass" event when condition evaluates to truthy', async () => {
        const condition = {
          latency: { $lte: 1000 },
        };
        const rule = createRule({ condition });
        rule.start(queueListener);
        const successSpy = jest.fn();
        rule.on('pass', successSpy);
        await postJob(rule, { latency: 500 });

        expect(successSpy).toHaveBeenCalledTimes(1);
      });
    });

    it('emits "fail" event when condition evaluates to falsy', async () => {
      const condition = {
        latency: { $lte: 1000 },
      };
      const rule = createRule({ condition });
      const failSpy = jest.fn();

      rule.start(queueListener);
      rule.on('fail', failSpy);

      await postJob(rule, { latency: 1500 });

      expect(failSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('toJSON() and fromJSON()', () => {
    const context = createContext();

    const conditions = {
      'user.id': { $eq: 10 },
    };

    const name = 'testName';
    let rule: Rule;

    it('serializes itself', () => {
      const json = rule.toJSON() as Record<string, any>;
      expect(Object.keys(json).length).toBe(4);
      expect(json.condition).toEqual(conditions);
      expect(json.name).toBe(name);
    });

    it('serializes itself as json', () => {
      const json = rule.toJSON() as Record<string, any>;
      expect(typeof json).toBe('object');
      expect(json.condition).toEqual(conditions);
      expect(json.name).toBe(name);
    });

    it('rehydrates itself using a JSON string', () => {
      const json = rule.toJSON();
      expect(typeof json).toBe('object');
      const jsonString = JSON.stringify(json);
      const hydratedRule = Rule.fromJSON(jsonString);
      expect(hydratedRule.condition).toEqual(rule.condition);
      expect(hydratedRule.name).toBe(rule.name);
    });

    it('rehydrates itself using an object from JSON.parse()', () => {
      const json = rule.toJSON();
      const hydratedRule = Rule.fromJSON(json);
      expect(hydratedRule.condition).toEqual(rule.condition);
      expect(hydratedRule.name).toBe(rule.name);
    });
  });
});
