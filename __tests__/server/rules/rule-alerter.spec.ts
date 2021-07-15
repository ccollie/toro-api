import random from 'lodash/random';
import { Rule, RuleAlerter, RuleStorage } from '@src/server/rules';
import { delay, getRandomBool } from '../utils';
import { clearDb, createQueueManager, createRule } from '../../factories';
import {
  ErrorLevel,
  EvaluationResult,
  RuleAlert,
  RuleConfigOptions,
  RuleOperator,
  RuleState,
  RuleType,
} from '@src/types';
import { QueueManager } from '@src/server/queues';
import { ManualClock, nanoid } from '@src/server/lib';

describe('RuleEAlerter', () => {
  let queueManager: QueueManager;
  let storage: RuleStorage;
  let clock: ManualClock;
  let successResult: EvaluationResult;
  let errorResult: EvaluationResult;
  let warningResult: EvaluationResult;
  let hostName: string;

  beforeEach(async () => {
    hostName = 'host-' + nanoid();
    queueManager = createQueueManager();
    storage = new RuleStorage(hostName, queueManager.queue, queueManager.bus);
    clock = new ManualClock();
    successResult = createSuccessResult();
    errorResult = createFailResult(ErrorLevel.CRITICAL);
    warningResult = createFailResult(ErrorLevel.WARNING);
  });

  afterEach(async () => {
    await queueManager.destroy();
    await clearDb();
  });

  async function getLastAlert(rule: Rule): Promise<RuleAlert> {
    return storage.getAlert(rule, '+');
  }

  async function createAlerter(
    options?: Partial<RuleConfigOptions>,
  ): Promise<RuleAlerter> {
    const rule = createRule(options);
    await storage.saveRule(rule);
    return new RuleAlerter(queueManager, rule, clock);
  }

  function createResult(
    opts: Partial<EvaluationResult> = {},
  ): EvaluationResult {
    const triggered = opts.triggered ?? getRandomBool();
    let level = ErrorLevel.NONE;
    if (opts.errorLevel === undefined) {
      level = !triggered
        ? ErrorLevel.NONE
        : [ErrorLevel.WARNING, ErrorLevel.CRITICAL][random(0, 1)];
    }
    const value = random(10, 1000);
    return {
      triggered,
      errorLevel: level,
      value,
      state: {
        ruleType: RuleType.THRESHOLD,
        errorLevel: level,
        value,
        errorThreshold: 240,
        comparator: RuleOperator.GT,
        unit: 'ms',
      },
      ...opts,
    };
  }

  function createSuccessResult() {
    return createResult({ triggered: true });
  }

  function createFailResult(level?: ErrorLevel.WARNING | ErrorLevel.CRITICAL) {
    return createResult({ triggered: false, errorLevel: level });
  }

  async function postResult(
    sut: RuleAlerter,
    result: EvaluationResult,
    wait = true,
  ): Promise<void> {
    await sut.handleResult(result);
    if (wait) {
      await delay(30);
    }
  }

  async function trigger(
    sut: RuleAlerter,
    level?: ErrorLevel.WARNING | ErrorLevel.CRITICAL,
    wait = true,
  ): Promise<void> {
    return postResult(sut, createFailResult(level), wait);
  }

  async function reset(sut: RuleAlerter, wait = true): Promise<void> {
    return postResult(sut, successResult, wait);
  }

  describe('constructor', () => {
    it('can create a RuleAlerter', () => {
      const rule = createRule({});

      const alerter = new RuleAlerter(queueManager, rule, clock);
      expect(alerter).toBeDefined();
      expect(alerter.queue).toBe(queueManager.queue);
      expect(alerter.rule).toBe(rule);
    });
  });

  describe('.handleResult', () => {
    it('does not notify if the rule is not active', async () => {
      const sut = await createAlerter({ isActive: false });
      await trigger(sut);
      expect(sut.state).toBeUndefined();
      expect(sut.isTriggered).toBe(false);
    });
  });

  describe('Alerts', () => {
    it('raise an alert on trigger', async () => {
      const payload = {
        num: random(0, 99),
        str: nanoid(),
      };

      const sut = await createAlerter({
        isActive: true,
        payload,
        message: '{{rule.id}} is fantastic',
      });

      const result = createFailResult(ErrorLevel.WARNING);
      await sut.handleResult(result);

      await delay(40);
      const alert = await getLastAlert(sut.rule);

      expect(alert).toBeDefined();
      expect(alert.raisedAt).toBeDefined();
      expect(alert.status).toBe('open');
      expect(alert.errorLevel).toBe(result.errorLevel);
      expect(alert.message).toBeDefined();
      expect(alert.value).toBe(result.value);
    });

    it('raise an event on reset', async () => {
      const sut = await createAlerter({
        isActive: true,
      });

      await trigger(sut);
      // should be triggered

      await reset(sut);

      await delay(20);
      // expect(triggerSpy).toHaveBeenCalledTimes(1);
    });

    it('does not raise an alert if the rule is not ACTIVE', async () => {
      const sut = await createAlerter({ isActive: false });

      await trigger(sut);
      expect(sut.isTriggered).toBeFalsy();
    });

    it('triggers a states change on a warning', async () => {
      const sut = await createAlerter({ isActive: true });

      await trigger(sut, ErrorLevel.WARNING);
      expect(sut.state).toBe(RuleState.WARNING);
    });

    it('increases the number of failures when triggered', async () => {
      const sut = await createAlerter({ isActive: true });

      await trigger(sut);
      expect(sut.failures).toBe(1);

      await trigger(sut);
      expect(sut.failures).toBe(2);
    });

    it('zeroes the failure count when reset', async () => {
      const sut = await createAlerter({ isActive: true });

      await trigger(sut);
      expect(sut.failures).toBe(1);

      await reset(sut);
      expect(sut.failures).toBe(0);
    });

    describe('Options', () => {
      it('respects the warmupWindow option', async () => {
        const timeout = 100;
        const sut = await createAlerter({
          options: {
            warmupWindow: timeout,
          },
        });

        await sut.start();

        expect(sut.isWarmingUp).toBe(true);
        await trigger(sut);

        expect(sut.isWarmingUp).toBe(true);

        clock.advanceBy(timeout);
        await trigger(sut);

        expect(sut.isWarmingUp).toBe(false);
      });

      it('only raises an alert after a minimum number of violations', async () => {
        const MIN_VIOLATIONS = 3;

        const sut = await createAlerter({
          options: {
            failureThreshold: MIN_VIOLATIONS,
          },
        });

        for (let i = 0; i < MIN_VIOLATIONS - 1; i++) {
          await sut.handleResult(errorResult);
        }
        await delay(50);

        expect(sut.alertCount).toBe(0);
        expect(sut.failures).toBe(MIN_VIOLATIONS);

        await trigger(sut);
        expect(sut.alertCount).toBe(1);

        const alert = getLastAlert(sut.rule);
        expect(alert).toBeDefined();
      });

      it('respects the max number of repeats per event', async () => {
        const MAX_ALERTS = 4;

        const sut = await createAlerter({
          options: {
            maxAlertsPerEvent: MAX_ALERTS,
          },
        });

        for (let i = 0; i < MAX_ALERTS + 2; i++) {
          await sut.handleResult(errorResult);
        }

        await delay(40);
        expect(sut.alertCount).toBe(MAX_ALERTS);
      });

      it('waits a specified amount of time between alerts', async () => {
        const options = {
          notifyInterval: 100,
        };

        const sut = await createAlerter({
          options,
        });
        await sut.start();

        await trigger(sut);
        expect(sut.alertCount).toBe(1);
        clock.advanceBy(20);

        await trigger(sut);
        expect(sut.alertCount).toBe(1);
        clock.advanceBy(20);

        await trigger(sut);
        expect(sut.alertCount).toBe(1);

        clock.advanceBy(60);

        await trigger(sut);
        expect(sut.alertCount).toBe(2);
      });

      it('waits a specified amount of time before resetting', async () => {
        // jest.useFakeTimers();
        const payload = {
          num: random(0, 99),
          str: nanoid(),
        };
        const options = {
          alertOnReset: true,
          recoveryWindow: 5000,
        };
        const sut = await createAlerter({
          options,
          payload,
        });
        const rule = sut.rule;
        await sut.start();

        try {
          await trigger(sut);
          expect(sut.isTriggered).toBe(true);

          await reset(sut);
          // should not call yet
          expect(sut.isTriggered).toBe(true);

          // wait for the expected period
          clock.advanceBy(options.recoveryWindow);

          // i hate this, but i can't get jest to fake setInterval
          await delay(520);

          expect(rule.state).toBe(RuleState.NORMAL);
          expect(sut.isTriggered).toBe(false);
        } finally {
          await sut.stop(); // kill timer
        }
      });
    });

    // todo: should not add a new alert if previous is not reset
  });
});
