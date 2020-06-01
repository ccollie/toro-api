import random from 'lodash/random';
import { RuleEvaluator, RuleManager } from '../../../src/server/rules';
import { clearDb, delay } from '../utils';
import { createRuleManager, QueueListenerHelper } from '../../fixtures';
import { MetricsListener } from '../../../src/server/metrics';
import {
  RuleAlert,
  RuleCondition,
  RuleConfigOptions,
  RuleEventsEnum,
  RuleOperator,
  RuleState,
  RuleType
} from '../../../src/types';
import { createRule, randomString } from './utils';
import { QueueListener } from '../../../src/server/queues';
import { ManualClock } from '../../../src/server/lib';

describe('Rule Behaviour', () => {
  let ruleManager: RuleManager;
  let queueListener: QueueListener;
  let listenerHelper: QueueListenerHelper;
  let metricsListener: MetricsListener;
  let clock: ManualClock;

  beforeEach(async () => {
    ruleManager = await createRuleManager();
    queueListener = ruleManager.queueListener;
    clock = queueListener.clock as ManualClock;
    listenerHelper = new QueueListenerHelper(queueListener);
    metricsListener = new MetricsListener(queueListener);
  })

  afterEach(async () => {
    const bus = ruleManager.bus;
    bus.destroy();
    // hacky
    await (bus as any).aggregator.destroy();
    await clearDb();
  });

  const LatencyThresholdCondition: RuleCondition = {
    type: RuleType.THRESHOLD,
    errorThreshold: 1000,
    operator: RuleOperator.gt
  }

  async function postJob(options?: Record<string, any>, needDelay = true): Promise<void> {
    await listenerHelper.postCompletedEvent(options);
    if (needDelay) {
      await delay(20);
    }
  }

  function createEvaluator(
    options?: Partial<RuleConfigOptions>
  ): RuleEvaluator {
    const rule = createRule(options);
    return new RuleEvaluator(rule, metricsListener);
  }

  describe('Events', () => {

    test('emits states change event when condition evaluates to truthy', async () => {
      const evaluator = createEvaluator({
        condition: LatencyThresholdCondition
      })

      const rule = evaluator.rule;

      let count = 0;
      rule.on(RuleEventsEnum.STATE_CHANGED, ({ state, rule }) => {
        if (state === RuleState.ERROR) count++;
      });

      await postJob({ latency: 3400 });

      expect(count).toBe(1);
    });

    test('emits states change event when condition resets', async () => {
      const evaluator = createEvaluator({
        condition: LatencyThresholdCondition
      })
      const rule = evaluator.rule;

      let count = 0;
      rule.on(RuleEventsEnum.STATE_CHANGED, ({ state }) => {
        if (state === RuleState.NORMAL) count++;
      });

      await postJob({ latency: 3400 });

      await delay(40);

      await postJob({ latency: 100 });

      expect(count).toBe(1);
    });

    test('emits states change event on warning', async () => {
      const condition: RuleCondition = {
        type: RuleType.THRESHOLD,
        errorThreshold: 1000,
        warningThreshold: 500,
        operator: RuleOperator.gt
      }
      const evaluator = createEvaluator({
        condition
      })
      const rule = evaluator.rule;

      let count = 0;
      rule.on(RuleEventsEnum.STATE_CHANGED, ({ state }) => {
        if (state === RuleState.WARNING) count++;
      });

      await postJob({ latency: 510 });

      expect(count).toBe(1);
    });
  });

  const successData = { latency: 1500 };
  const failureData = { latency: 500 };

  describe('Alerts', () => {

    it('can raise an alert', async () => {
      const evaluator = createEvaluator({
        condition: {
          type: RuleType.THRESHOLD,
          errorThreshold: 200,
          operator: RuleOperator.gt
        }
      })
      const rule = evaluator.rule;
      let alert: RuleAlert;
      const triggerSpy = jest.fn();

      rule.on(RuleEventsEnum.ALERT_TRIGGERED, (data: RuleAlert) => {
        triggerSpy();
        alert = data;
      });
      await postJob({ latency: 300 });

      expect(triggerSpy).toHaveBeenCalledTimes(1);
      expect(alert).toBeDefined();
      expect(alert.start).toBeDefined();
      expect(alert.event).toBe(RuleEventsEnum.ALERT_TRIGGERED);
      expect(alert.message).toBeDefined();
      expect(rule.alertCount).toBe(1);
      expect(rule.isTriggered).toBe(true);

    });

    it('does not trigger an alert on a FAILED condition', async () => {
      const evaluator = createEvaluator({
        condition: LatencyThresholdCondition
      })
      const rule = evaluator.rule;
      const triggerSpy = jest.fn();

      rule.on(RuleEventsEnum.ALERT_TRIGGERED, triggerSpy);
      await postJob({ latency: 250 });

      expect(triggerSpy).toHaveBeenCalledTimes(0);
      expect(rule.isTriggered).toBe(false);
    });

    it('does not raise an alert if the rule is not ACTIVE', async () => {
      const evaluator = createEvaluator({
        condition: LatencyThresholdCondition,
        active: false
      });
      const rule = evaluator.rule;
      const triggerSpy = jest.fn();

      rule.on(RuleEventsEnum.ALERT_TRIGGERED, triggerSpy);
      await postJob(failureData);

      expect(triggerSpy).toHaveBeenCalledTimes(0);
    });

    test('respects the warmupWindow interval', async () => {
      const timeout = 100;
      const evaluator = createEvaluator({
        condition: LatencyThresholdCondition,
        options: {
          warmupWindow: timeout,
        },
      });

      const eventSpy = jest.fn();
      const rule = evaluator.rule;
      rule.start(clock);
      rule.on(RuleEventsEnum.ALERT_TRIGGERED, eventSpy);
      expect(rule.isWarmingUp).toBe(true);
      await postJob(successData);
      expect(eventSpy).not.toHaveBeenCalled();

      clock.advanceBy(timeout);
      expect(rule.isWarmingUp).toBe(false);
      await postJob(successData);

      expect(eventSpy).toHaveBeenCalledTimes(1);
    });

    it('only raises an alert after triggerWindow', async () => {
      const ALERT_DELAY = 100;

      const evaluator = createEvaluator({
        condition: LatencyThresholdCondition,
        options: {
          triggerWindow: ALERT_DELAY
        },
      });
      const rule = evaluator.rule;
      rule.start(clock);
      const triggerSpy = jest.fn();
      rule.on(RuleEventsEnum.ALERT_TRIGGERED, triggerSpy);
      await postJob(successData);

      expect(triggerSpy).toHaveBeenCalledTimes(0);

      clock.advanceBy(ALERT_DELAY);
      // should post a different value, since metric event is only raised on change
      await postJob({ latency: 3000 });

      expect(triggerSpy).toHaveBeenCalledTimes(1);
      expect(rule.alertCount).toBe(1);
    });

    it('increases the number of violations when triggered', async () => {
      const evaluator = createEvaluator({
        condition: {
          type: RuleType.THRESHOLD,
          errorThreshold: 200,
          operator: RuleOperator.gt
        }
      })
      const rule = evaluator.rule;

      await postJob({ latency: 300 });

      expect(rule.violations).toBe(1);

      await postJob({ latency: 500 });

      expect(rule.violations).toBe(2);
    });

    it('zeroes the violation count when reset', async () => {
      const evaluator = createEvaluator({
        condition: {
          type: RuleType.THRESHOLD,
          errorThreshold: 500,
          operator: RuleOperator.gt
        }
      })
      const rule = evaluator.rule;

      await postJob({ latency: 1000 });

      expect(rule.violations).toBe(1);

      await postJob({ latency: 100 });

      expect(rule.violations).toBe(0);
    });

    it('only raises an alert after a minimum number of violations', async () => {
      const MIN_VIOLATIONS = 3;

      const evaluator = createEvaluator({
        condition: LatencyThresholdCondition,
        options: {
          minViolations: MIN_VIOLATIONS
        },
      });
      const rule = evaluator.rule;
      const triggerSpy = jest.fn();

      rule.on(RuleEventsEnum.ALERT_TRIGGERED, triggerSpy);

      for(let i = 0; i < MIN_VIOLATIONS - 1; i++) {
        await postJob( { latency: 1500 + i });
      }

      expect(triggerSpy).toHaveBeenCalledTimes(0);

      await postJob(successData);
      expect(triggerSpy).toHaveBeenCalledTimes(1);

      // should post a different value, since metric event is only raised on change
      await postJob({ latency: 3000 });
      expect(triggerSpy).toHaveBeenCalledTimes(2);
    });

    it('respects the max number of repeats per event', async () => {
      const MAX_ALERTS = 4;

      const evaluator = createEvaluator({
        condition: LatencyThresholdCondition,
        options: {
          maxAlertsPerEvent: MAX_ALERTS
        },
      });
      const rule = evaluator.rule;
      const triggerSpy = jest.fn();

      rule.on(RuleEventsEnum.ALERT_TRIGGERED, triggerSpy);

      for(let i = 0; i < MAX_ALERTS + 2; i++) {
        await postJob( { latency: 1500 + i });
      }

      expect(triggerSpy).toHaveBeenCalledTimes(MAX_ALERTS);
      expect(rule.alertCount).toBe(MAX_ALERTS);
    });

    it('waits a specified amount of time between alerts', async () => {
      const options = {
        renotifyInterval: 100
      };

      const evaluator = createEvaluator({
        condition: LatencyThresholdCondition,
        options
      });
      const rule = evaluator.rule;
      const triggerSpy = jest.fn();
      const clock = queueListener.clock as ManualClock;
      rule.start(clock);
      rule.on(RuleEventsEnum.ALERT_TRIGGERED, triggerSpy);

      await postJob(successData);
      expect(triggerSpy).toHaveBeenCalledTimes(1);
      clock.advanceBy(20);

      await postJob(successData);
      expect(triggerSpy).toHaveBeenCalledTimes(1);

      clock.advanceBy(20);
      await postJob(successData);
      expect(triggerSpy).toHaveBeenCalledTimes(1);

      clock.advanceBy(60);
      // should post a different value, since metric event is only raised on change
      await postJob({ latency: 3000 });
      expect(triggerSpy).toHaveBeenCalledTimes(2);
    });

    it ('resets the states after the condition evaluates falsy', async () => {
      const payload = {
        num: random(10, 1000),
        str: randomString()
      };
      const options = {
        alertOnReset: true
      };
      const evaluator = createEvaluator({
        condition: LatencyThresholdCondition,
        options,
        payload
      });
      const rule = evaluator.rule;
      const triggerSpy = jest.fn();
      let alert: RuleAlert;

      rule.on(RuleEventsEnum.ALERT_RESET, triggerSpy);

      await postJob(failureData);
      expect(triggerSpy).toHaveBeenCalledTimes(0);

      await postJob(successData);
      expect(rule.isTriggered).toBe(true);

      rule.on(RuleEventsEnum.ALERT_RESET, (data: RuleAlert) => {
        alert = data;
      });

      await postJob(failureData);

      expect(triggerSpy).toHaveBeenCalledTimes(1);
      expect(rule.alertCount).toBe(0);
      expect(rule.isTriggered).toBe(false);
      expect(alert).toBeDefined();
      expect(alert.start).toBeDefined();
      expect(alert.end).toBeDefined();
      expect(alert.event).toBe(RuleEventsEnum.ALERT_RESET);
      expect(alert.message).toBeDefined();
      expect(alert.payload).toStrictEqual(payload);
    });

    it ('waits a specified amount of time before resetting', async () => {
     // jest.useFakeTimers();
      const payload = {
        num: random(0, 99),
        str: randomString()
      };
      const options = {
        alertOnReset: true,
        recoveryWindow: 5000
      };
      const evaluator = createEvaluator({
        condition: LatencyThresholdCondition,
        options,
        payload
      });
      const rule = evaluator.rule;
      rule.start(clock);
      const triggerSpy = jest.fn();

      rule.on(RuleEventsEnum.ALERT_RESET, triggerSpy);

      try {
        await postJob(successData);
        expect(rule.isTriggered).toBe(true);

        await postJob(failureData);
        // should not call yet
        expect(triggerSpy).toHaveBeenCalledTimes(0);

        // wait for the expected period
        clock.advanceBy(options.recoveryWindow);

        // i hate this, but i can't get jest to fake setInterval
        await delay(520);

        expect(rule.state).toBe(RuleState.NORMAL);
        expect(triggerSpy).toHaveBeenCalledTimes(1);
      } finally {
        rule.stop(); // kill timer
      }
    });
  });
});
