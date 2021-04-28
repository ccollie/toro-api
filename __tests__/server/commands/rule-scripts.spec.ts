import { Rule, RuleStorage } from '../../../src/server/rules';
import { delay } from '../utils';
import { clearDb, createQueueManager, createRule } from '../../factories';
import {
  ErrorLevel,
  RuleAlert,
  RuleConfigOptions,
  RuleEventsEnum,
  RuleState,
} from '../../../src/types';
import { QueueManager } from '../../../src/server/queues';
import {
  getRuleStateKey,
  getUniqueId,
  ManualClock,
  randomString,
} from '../../../src/server/lib';
import {
  AlertData,
  CheckAlertResult,
  CircuitState,
  MarkNotifyResult,
  RuleAlertState,
  RuleScripts,
} from '../../../src/server/commands';
import { Queue } from 'bullmq';
import { random } from 'lodash';

describe('RuleScripts', () => {
  let queueManager: QueueManager;
  let queue: Queue;
  let storage: RuleStorage;
  let clock: ManualClock;

  beforeEach(async () => {
    queueManager = createQueueManager();
    queue = queueManager.queue;
    storage = new RuleStorage(queue, queueManager.bus);
    clock = new ManualClock();
  });

  afterEach(async () => {
    await queueManager.destroy();
    storage.destroy();
    await clearDb();
  });

  async function addRule(opts?: Partial<RuleConfigOptions>): Promise<Rule> {
    const rule = createRule(opts);
    return storage.saveRule(rule);
  }

  async function getLastAlert(rule: Rule): Promise<RuleAlert> {
    return storage.getAlert(rule, '+');
  }

  function getId(rule: Rule | string): string {
    if (typeof rule === 'string') return rule;
    return rule.id;
  }

  function getRule(id: string): Promise<Rule> {
    return storage.getRule(id);
  }

  function createAlertData(): AlertData {
    const alertData: AlertData = {
      errorLevel: ErrorLevel.CRITICAL,
      id: getUniqueId(),
      message: randomString(15),
      value: random(1200),
      state: {
        num: random(1, 1000),
        str: randomString(),
      },
    };
    return alertData;
  }

  async function postResult(
    rule: Rule,
    level: ErrorLevel,
    timestamp?: number,
  ): Promise<CheckAlertResult> {
    const result = await RuleScripts.checkAlert(
      queue,
      rule,
      level,
      timestamp ?? clock.getTime(),
    );
    return result;
  }

  async function postFailure(
    rule: Rule,
    level?: ErrorLevel.WARNING | ErrorLevel.CRITICAL,
    timestamp?: number,
  ): Promise<CheckAlertResult> {
    return postResult(rule, level, timestamp);
  }

  async function postSuccess(
    rule: Rule,
    timestamp?: number,
  ): Promise<CheckAlertResult> {
    return postResult(rule, ErrorLevel.NONE, timestamp);
  }

  async function getRawState(rule: Rule | string): Promise<RuleAlertState> {
    const id = getId(rule);
    const ruleStateKey = getRuleStateKey(queue, id);
    const client = await queue.client;
    const fromRedis = await client.hgetall(ruleStateKey);
    return (fromRedis as unknown) as RuleAlertState;
  }

  async function getState(rule: Rule): Promise<RuleAlertState> {
    return RuleScripts.getState(queue, rule, clock.getTime());
  }

  describe('Initial state', () => {
    it('should start in closed state', async () => {
      const rule = await addRule({ isActive: true });
      const state = await getState(rule);
      expect(state.state).not.toBe(CircuitState.OPEN);
    });
  });

  describe('startRule', () => {
    it('can start a Rule', async () => {
      const rule = await createRule();
      const started = await RuleScripts.startRule(queue, rule);
      expect(started).toBe(true);
    });

    it('handles the warmup option', async () => {
      const rule = await addRule({
        options: {
          warmupWindow: 1500,
        },
      });
      const started = await RuleScripts.startRule(queue, rule);
      expect(started).toBe(true);
    });
  });

  describe('stopRule', () => {
    it('does not notify if the rule is not active', async () => {
      const rule = await createRule({
        isActive: false,
      });
      const result = await postFailure(rule);
      expect(result.status).toBe('inactive');
      expect(result.failures).toBeFalsy();
    });
  });

  describe('failure', () => {
    it('should increment the number of failures', async () => {
      const rule = await addRule({ isActive: true });
      const result = await postFailure(rule);
      expect(result.failures).toBe(1);
    });

    it('updates rule state metadata', async () => {
      const rule = await addRule({ isActive: true });
      const now = clock.getTime();
      await postFailure(rule, ErrorLevel.WARNING, now);

      let state = await RuleScripts.getState(queue, rule, now);
      expect(state.state).toBe(CircuitState.OPEN);
      expect(state.isActive).toBe(rule.isActive);
      expect(state.failures).toBe(1);
      expect(state.totalFailures).toBe(1);
      expect(state.lastFailure).toBe(now);
      expect(state.alertId).not.toBeTruthy();

      await postFailure(rule);
      state = await RuleScripts.getState(queue, rule, now);
      expect(state.failures).toBe(2);
      expect(state.totalFailures).toBe(2);

      await postSuccess(rule);
      state = await RuleScripts.getState(queue, rule, now);
      expect(state.failures).toBe(1);
      expect(state.totalFailures).toBe(2);
    });

    it('should raise an alert after max failures is reached', async () => {
      const rule = await addRule({
        isActive: true,
        options: { failureThreshold: 3, recoveryWindow: 100 },
      });

      let result = await postFailure(rule);
      expect(result.state).toBe(CircuitState.CLOSED);
      result = await postFailure(rule);
      expect(result.state).toBe(CircuitState.CLOSED);
      result = await postFailure(rule);
      expect(result.state).toBe(CircuitState.OPEN);
    });

    it('should auto resolve after no errors in the cooldown period', async () => {
      const rule = await addRule({
        isActive: true,
        options: { recoveryWindow: 100 },
      });

      let result = await postFailure(rule);
      expect(result.state).toBe(CircuitState.OPEN);
      clock.advanceBy(50);
      let state = await RuleScripts.getState(queue, rule, clock.getTime());
      expect(state.state).toBe(CircuitState.OPEN);

      clock.advanceBy(51);
      state = await RuleScripts.getState(queue, rule, clock.getTime());
      expect(state.state).toBe(CircuitState.CLOSED);
    });

    it('should extend the cooldown period if a new failure occurs', async () => {
      const rule = await addRule({
        isActive: true,
        options: { recoveryWindow: 100 },
      });

      let result = await postFailure(rule);
      clock.advanceBy(50);
      expect(result.state).toBe(CircuitState.OPEN);
      await postFailure(rule);
      clock.advanceBy(51);
      let state = await RuleScripts.getState(queue, rule, clock.getTime());
      expect(state.state).toBe(CircuitState.OPEN);
      clock.advanceBy(101);
      state = await RuleScripts.getState(queue, rule, clock.getTime());
      expect(state.state).toBe(CircuitState.CLOSED);
    });

    it('should update the rule state with a WARNING', async () => {
      const rule = await addRule({ isActive: true });
      const now = clock.getTime();
      await postFailure(rule, ErrorLevel.WARNING);
      const fromRedis = await getRule(rule.id);
      expect(fromRedis.state).toBe(RuleState.WARNING);
      expect(fromRedis.lastTriggeredAt).toBe(now);
    });

    it('should update the rule state with an ERROR', async () => {
      const rule = await addRule({ isActive: true });
      const now = clock.getTime();
      await postFailure(rule, ErrorLevel.CRITICAL, now);
      const fromRedis = await getRule(rule.id);
      expect(fromRedis.state).toBe(RuleState.ERROR);
      expect(fromRedis.lastTriggeredAt).toBe(now);
    });

    it('should emit a failure event', async (done) => {
      jest.setTimeout(10000);

      const rule = await addRule({
        isActive: true,
      });

      await queueManager.bus.on(RuleEventsEnum.STATE_CHANGED, (eventData) => {
        done();
      });
      await delay(1000);
      await postFailure(rule, ErrorLevel.WARNING);
    });
  });

  describe('success', () => {
    it('should reset number of failures to 0', async () => {
      const rule = await addRule({ isActive: true });

      for (let i = 0; i < 5; i++) {
        await postFailure(rule);
      }

      let state = await getState(rule);
      expect(state.failures).toBe(5);

      const result = await postSuccess(rule);
      expect(result.failures).toBe(0);

      state = await getRawState(rule);
      expect(state.failures).toBe(0);
      expect(state.successes).toBe(1);
      expect(state.totalFailures).toBe(5);
    });

    it('updates rule state metadata', async () => {
      const rule = await addRule({ isActive: true });
      const now = clock.getTime();
      await postFailure(rule, ErrorLevel.CRITICAL, now);
      await postFailure(rule);

      let result = await postSuccess(rule);
      const state = await RuleScripts.getState(queue, rule, now);
      expect(state.state).toBe(CircuitState.CLOSED);
      expect(state.failures).toBe(0);
      expect(state.totalFailures).toBe(2);
    });

    it('should resolve error after a successful result', async () => {
      const rule = await addRule({ isActive: true });

      let result = await postFailure(rule);
      expect(result.state).toBe(CircuitState.OPEN);

      result = await postSuccess(rule);
      expect(result.state).toBe(CircuitState.CLOSED);
    });

    it('should resolve error after a specified number of consecutive successes', async () => {
      const rule = await addRule({
        isActive: true,
        options: {
          successThreshold: 3,
        },
      });

      let result = await postFailure(rule);
      expect(result.state).toBe(CircuitState.OPEN);

      result = await postSuccess(rule);
      expect(result.state).toBe(CircuitState.OPEN);

      result = await postSuccess(rule);
      expect(result.state).toBe(CircuitState.OPEN);

      result = await postSuccess(rule);
      expect(result.state).toBe(CircuitState.CLOSED);
    });

    it('should emit success event', async (done) => {
      const rule = await addRule({ isActive: true });
    });
  });

  describe('writeAlert', () => {
    it('writes an alert to redis', async () => {
      const rule = await addRule({ isActive: true });
      const now = clock.getTime();

      await postFailure(rule);

      const alertData = createAlertData();
      const alert = await RuleScripts.writeAlert(queue, rule, alertData, now);
      expect(alert).toBeDefined();
      expect(alert.ruleId).toBe(rule.id);
      expect(alert.value).toBe(alertData.value);
      expect(alert.status).toBe('open');
      expect(alert.errorLevel).toBe(ErrorLevel.CRITICAL);
      expect(alert.raisedAt).toBe(now);
      expect(alert.message).toBe(alertData.message);
      expect(alert.failures).toBe(1);
      expect(alert.severity).toBe(rule.severity);
    });

    it('updates the rule state', async () => {
      const rule = await addRule({ isActive: true });
      const now = clock.getTime();

      await postFailure(rule);

      const alertData = createAlertData();
      alertData.errorLevel = ErrorLevel.WARNING;
      const alert = await RuleScripts.writeAlert(queue, rule, alertData, now);

      const fromRedis = await getRule(rule.id);
      expect(fromRedis.state).toBe(RuleState.WARNING);
    });

    it('emits an event', async () => {});
  });

  describe('markNotify', () => {});

  describe('Alerts', () => {
    it('raise an event on reset', async () => {
      const rule = createRule({ isActive: true });

      await postFailure(rule);
      // should be triggered

      await postSuccess(rule);

      await delay(20);
      // expect(triggerSpy).toHaveBeenCalledTimes(1);
    });

    it('does not raise an alert if the rule is not ACTIVE', async () => {
      const sut = await addRule({ isActive: false });

      const result = await postFailure(sut);
      expect(result.status).toBe('inactive');
      expect(result.failures).toBeFalsy();
    });

    it('triggers a state change on a warning', async () => {
      const rule = await addRule({ isActive: true });
      expect(rule.state).toBe(RuleState.NORMAL);

      const result = await postFailure(rule, ErrorLevel.WARNING);
      expect(result.state).toBe(CircuitState.HALF_OPEN);

      const fromRedis = await getRule(rule.id);
      expect(fromRedis.state).toBe(RuleState.WARNING);
    });

    describe('Options', () => {
      it('respects the warmupWindow option', async () => {
        const timeout = 100;
        const rule = await addRule({
          isActive: true,
          options: {
            warmupWindow: timeout,
          },
        });

        await RuleScripts.startRule(queue, rule, clock.getTime());
        let result = await postFailure(rule);

        expect(result.status).toBe('warmup');

        clock.advanceBy(timeout);
        await postFailure(rule);

        expect(result.status).toBe('ok');
      });

      // todo: should not add a new alert if previous is not reset
    });
  });

  describe('notifications', () => {
    it('notification state should be FALSE if rule has no channels', async () => {
      const rule = await addRule({
        isActive: true,
        channels: [],
      });

      const result = await postFailure(rule);
      expect(result.notify).toBe(false);

      const state = await getState(rule);
      expect(state.notifyPending).toBe(false);
    });

    it('notification state should be TRUE on failure', async () => {
      const rule = await addRule({
        isActive: true,
        channels: ['channel1', 'channel2'],
      });

      const result = await postFailure(rule);
      expect(result.notify).toBe(true);

      const state = await getState(rule);
      expect(state.notifyPending).toBe(true);
    });

    it('notification state should be FALSE on success', async () => {
      const rule = await addRule({
        isActive: true,
        channels: ['channel1', 'channel2'],
        options: {
          alertOnReset: false,
        },
      });

      let result = await postFailure(rule);
      expect(result.notify).toBe(true);

      result = await postSuccess(rule);
      expect(result.notify).toBe(false);
    });

    it('notification state should be TRUE when reset and alertOnReset = TRUE', async () => {
      const rule = await addRule({
        isActive: true,
        channels: ['channel1', 'channel2'],
        options: {
          alertOnReset: true,
        },
      });

      await postFailure(rule);
      const result = await postSuccess(rule);
      expect(result.notify).toBe(true);

      const state = await getState(rule);
      expect(state.notifyPending).toBe(true);
    });

    describe('markNotify', () => {
      function notify(rule: Rule, alertId: string): Promise<MarkNotifyResult> {
        return RuleScripts.markNotify(queue, rule, alertId, clock.getTime());
      }

      it('respects the max number of repeats per event', async () => {
        const MAX_ALERTS = 4;

        const rule = await addRule({
          isActive: true,
          channels: ['channel1', 'channel2'],
          options: {
            maxAlertsPerEvent: MAX_ALERTS,
          },
        });

        let result: CheckAlertResult;
        let notifyResult: MarkNotifyResult;

        for (let i = 0; i < MAX_ALERTS + 2; i++) {
          result = await postFailure(rule);
          notifyResult = await notify(rule, result.alertId);
        }

        const state = await getState(rule);

        expect(state.alertCount).toBe(MAX_ALERTS);
      });

      it('waits a specified amount of time between notifications', async () => {
        const options = {
          notifyInterval: 100,
        };

        const rule = await addRule({
          isActive: true,
          options,
        });

        let result = await postFailure(rule);
        expect(result.alertCount).toBe(1);
        clock.advanceBy(20);

        result = await postFailure(rule);
        expect(result.alertCount).toBe(1);
        clock.advanceBy(20);

        result = await postFailure(rule);
        expect(result.alertCount).toBe(1);

        clock.advanceBy(60);

        result = await postFailure(rule);
        expect(result.alertCount).toBe(2);
      });
    });
  });
});
