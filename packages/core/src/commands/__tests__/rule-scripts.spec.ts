import { Queue } from 'bullmq';
import { random } from '@alpen/shared';
import { nanoid } from 'nanoid';
import {
  createQueue,
  createQueueManager,
  createRule,
} from '../../__tests__/factories';
import {
  AlertData,
  CheckAlertResult,
  CircuitState,
  MarkNotifyResult,
  RuleAlertState,
  RuleScripts,
} from '../../commands';
import { delay, getUniqueId, ManualClock } from '../../lib';
import { QueueManager } from '../../queues';
import { EventBus } from '../../redis';
import { Rule, RuleStorage } from '../../rules';
import {
  ErrorStatus,
  RuleAlert,
  RuleConfigOptions,
  RuleEventsEnum,
  RuleState,
} from '../../types';

describe('RuleScripts', () => {
  let queueManager: QueueManager;
  let queue: Queue;
  let storage: RuleStorage;
  let clock: ManualClock;

  beforeEach(async () => {
    queue = await createQueue();
    queueManager = await createQueueManager(queue);
    storage = new RuleStorage(queueManager.host, queue, queueManager.bus);
    clock = new ManualClock();
  });

  afterEach(async () => {
    const client = await queue.client;
    //await clearDb(client);
    await queueManager.destroy();
    storage.destroy();
  });

  async function addRule(opts?: Partial<RuleConfigOptions>): Promise<Rule> {
    const rule = createRule(opts);
    return storage.saveRule(rule);
  }

  async function getAlert(rule: Rule, id: string): Promise<RuleAlert> {
    return storage.getAlert(rule, id);
  }

  function getRule(id: string): Promise<Rule> {
    return storage.getRule(id);
  }

  function createAlertData(errorStatus = ErrorStatus.ERROR): AlertData {
    return {
      errorStatus,
      id: getUniqueId(),
      message: nanoid(15),
      value: random(1200),
      state: {
        num: random(1, 1000),
        str: nanoid(),
      },
    };
  }

  async function postResult(
    rule: Rule,
    status: ErrorStatus,
    timestamp?: number,
  ): Promise<CheckAlertResult> {
    const alertData = createAlertData(status);
    return RuleScripts.checkAlert(
      queue,
      rule,
      alertData,
      timestamp ?? clock.getTime(),
    );
  }

  async function postFailure(
    rule: Rule,
    level?: ErrorStatus.WARNING | ErrorStatus.ERROR,
    timestamp?: number,
  ): Promise<CheckAlertResult> {
    return postResult(rule, level, timestamp);
  }

  async function postSuccess(
    rule: Rule,
    timestamp?: number,
  ): Promise<CheckAlertResult> {
    return postResult(rule, ErrorStatus.NONE, timestamp);
  }

  async function getState(rule: Rule): Promise<RuleAlertState> {
    return RuleScripts.getState(queue, rule, clock.getTime());
  }

  describe('Initial state', () => {
    it('should start in closed state', async () => {
      const rule = await addRule({ isActive: true });
      const state = await getState(rule);
      expect(state.circuitState).toBe(CircuitState.CLOSED);
    });
  });

  describe('activateRule', () => {
    it('can activate a Rule', async () => {
      const rule = await addRule({ isActive: true });
      const state = await RuleScripts.activateRule(queue, rule);
      expect(state).toBe('active');
      const fromRedis = await getRule(rule.id);
      expect(fromRedis.isActive).toBe(true);
    });
  });

  describe('deactivateRule', () => {
    it('does not stop an inactive Rule', async () => {
      const rule = await addRule({ isActive: false });
      const state = await RuleScripts.deactivateRule(queue, rule);
      expect(state).toBe('inactive');
      const fromRedis = await getRule(rule.id);
      expect(fromRedis.isActive).toBe(false);
    });

    it('does not notify if the rule is not active', async () => {
      const rule = await addRule({
        isActive: false,
      });
      const result = await postFailure(rule);
      expect(result.status).toBe('inactive');
      expect(result.failures).toBeFalsy();
    });
  });

  describe('failure', () => {
    it('should increment the number of failures', async () => {
      const rule = await addRule({
        isActive: true,
        options: { failureThreshold: 5 },
      });
      const result = await postFailure(rule);
      expect(result.failures).toBe(1);
    });

    it('updates rule state metadata', async () => {
      const rule = await addRule({ isActive: true });
      const now = clock.getTime();
      await postFailure(rule, ErrorStatus.WARNING, now);

      let state = await RuleScripts.getState(queue, rule, now);
      expect(state.circuitState).toBe(CircuitState.OPEN);
      expect(state.isActive).toBe(rule.isActive);
      expect(state.failures).toBe(1);
      expect(state.totalFailures).toBe(1);
      expect(state.lastFailure).toBe(now);
      expect(state.alertId).toBeTruthy();

      await postFailure(rule);
      state = await RuleScripts.getState(queue, rule, now);
      expect(state.failures).toBe(2);
      expect(state.totalFailures).toBe(2);

      await postSuccess(rule);
      state = await RuleScripts.getState(queue, rule, now);
      expect(state.failures).toBe(0);
      expect(state.totalFailures).toBe(2);
    });

    it('respects the "triggerDelay" option', async () => {
      const rule = await addRule({
        isActive: true,
        options: { failureThreshold: 1, triggerDelay: 100 },
      });

      const now = 5000;
      let result = await postFailure(rule, ErrorStatus.ERROR, now);
      expect(result.state).toBe(CircuitState.CLOSED);

      result = await postFailure(rule, ErrorStatus.ERROR, now + 10);
      expect(result.state).toBe(CircuitState.CLOSED);

      result = await postFailure(rule, ErrorStatus.ERROR, now + 100);
      expect(result.state).toBe(CircuitState.OPEN);
    });

    it('should raise an alert after failure threshold is reached', async () => {
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

      const alert = await getAlert(rule, result.alertId);
      expect(alert).toBeDefined();
      expect(alert.status).toBe('open');
      expect(alert.ruleId).toBe(rule.id);
    });

    it('should auto resolve after no errors in the cooldown period', async () => {
      const rule = await addRule({
        isActive: true,
        options: { recoveryWindow: 100 },
      });

      const result = await postFailure(rule);
      // rule runtime state can be different from the rule state
      expect(result.state).toBe(CircuitState.OPEN);
      clock.advanceBy(50);
      let state = await RuleScripts.getState(queue, rule, clock.getTime());
      expect(state.circuitState).toBe(CircuitState.OPEN);

      const alertId = state.alertId;

      clock.advanceBy(51);
      const resolvedAt = clock.getTime();

      state = await RuleScripts.getState(queue, rule, clock.getTime());
      expect(state.circuitState).toBe(CircuitState.CLOSED);

      const alert = await getAlert(rule, alertId);
      expect(alert.status).toBe('close');
      expect(alert.resetAt).toBe(resolvedAt);
    });

    it('should extend the cooldown period if a new failure occurs', async () => {
      const rule = await addRule({
        isActive: true,
        options: { recoveryWindow: 100 },
      });

      const result = await postFailure(rule);
      clock.advanceBy(50);
      expect(result.state).toBe(CircuitState.OPEN);
      await postFailure(rule);
      clock.advanceBy(51);
      let state = await RuleScripts.getState(queue, rule, clock.getTime());
      expect(state.circuitState).toBe(CircuitState.OPEN);
      clock.advanceBy(101);
      state = await RuleScripts.getState(queue, rule, clock.getTime());
      expect(state.circuitState).toBe(CircuitState.CLOSED);
    });

    it('should update the rule state with a WARNING', async () => {
      const rule = await addRule({ isActive: true });
      await postFailure(rule, ErrorStatus.WARNING);
      const state = await RuleScripts.getState(queue, rule);
      expect(state.errorStatus).toBe(ErrorStatus.WARNING);
    });

    it('should update the rule state with an ERROR', async () => {
      const rule = await addRule({ isActive: true });
      const now = clock.getTime();
      await postFailure(rule, ErrorStatus.ERROR, now);
      const fromRedis = await getRule(rule.id);
      expect(fromRedis.state).toBe(RuleState.ERROR);
      expect(fromRedis.lastTriggeredAt).toBe(now);
    });

    it('should emit a rule state change event on failure', async (done) => {
      jest.setTimeout(20000);

      const bus = queueManager.bus;
      await bus.waitUntilReady();
      bus.on(RuleEventsEnum.STATE_CHANGED, (eventData) => {
        done();
      });

      await delay(100);

      const rule = await addRule({
        isActive: true,
      });

      const res = await postFailure(rule, ErrorStatus.WARNING);
      await delay(5000);
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

      state = await getState(rule);
      expect(state.failures).toBe(0);
      expect(state.totalFailures).toBe(5);
    });

    it('updates rule state metadata', async () => {
      const rule = await addRule({ isActive: true });
      const now = clock.getTime();
      await postFailure(rule, ErrorStatus.ERROR, now);
      await postFailure(rule);

      const result = await postSuccess(rule);
      const state = await RuleScripts.getState(queue, rule, now);
      expect(state.circuitState).toBe(CircuitState.CLOSED);
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
    });

    it('should emit event on transition to normal', async () => {
      const rule = await addRule({ isActive: true });
      const bus = queueManager.bus;
      await bus.waitUntilReady();

      let eventData: any;

      bus.on(RuleEventsEnum.STATE_CHANGED, (evtData) => {
        eventData = evtData;
      });

      await postFailure(rule);
      await postSuccess(rule);

      await delay(1200);

      expect(eventData).toBeDefined();
    });
  });

  describe('writeAlert', () => {
    let hostName: string;

    beforeEach(() => {
      hostName = `host-${nanoid(4)}`;
    });

    it('writes an alert to redis', async () => {
      const rule = await addRule({ isActive: true });
      const now = clock.getTime();

      await postFailure(rule);

      const alertData = createAlertData();
      const alert = await RuleScripts.writeAlert(
        hostName,
        queue,
        rule,
        alertData,
        now,
      );
      expect(alert).toBeDefined();
      expect(alert.ruleId).toBe(rule.id);
      expect(alert.value).toBe(alertData.value);
      expect(alert.status).toBe('open');
      expect(alert.errorLevel).toBe(ErrorStatus.ERROR);
      expect(alert.raisedAt).toBe(now);
      expect(alert.message).toBe(alertData.message);
      expect(alert.failures).toBe(1);
      expect(alert.severity).toBe(rule.severity);
      expect(alert.isRead).toBe(false);
    });

    it('updates the rule state', async () => {
      const rule = await addRule({ isActive: true });
      const now = clock.getTime();

      await postFailure(rule);

      const alertData = createAlertData();
      alertData.errorStatus = ErrorStatus.WARNING;
      const alert = await RuleScripts.writeAlert(
        hostName,
        queue,
        rule,
        alertData,
        now,
      );

      const fromRedis = await getRule(rule.id);
      expect(fromRedis.state).toBe(RuleState.WARNING);
    });

    it('updates the queue alert count', async () => {
      const rule = await addRule({ isActive: true });
      const now = clock.getTime();

      await postFailure(rule);

      let alertData = createAlertData();
      alertData.errorStatus = ErrorStatus.WARNING;
      const alert = await RuleScripts.writeAlert(
        hostName,
        queue,
        rule,
        alertData,
        now,
      );

      let count = await RuleScripts.getQueueAlertCount(queue);
      expect(count).toBe(1);

      alertData = createAlertData();
      await RuleScripts.writeAlert(hostName, queue, rule, alertData, now);
      count = await RuleScripts.getQueueAlertCount(queue);
      expect(count).toBe(2);
    });
  });

  describe('Alerts', () => {
    it('raise an event on reset', async () => {
      const rule = await addRule({ isActive: true });

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

      const result = await postFailure(rule, ErrorStatus.WARNING);
      expect(result.state).toBe(CircuitState.OPEN);

      const fromRedis = await getRule(rule.id);
      expect(fromRedis.state).toBe(RuleState.WARNING);
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

    it('notification state should be TRUE when reset and alertOnReset == TRUE', async () => {
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

  describe('resetAlert', () => {
    let rule: Rule;
    let bus: EventBus;

    beforeEach(async () => {
      bus = queueManager.bus;
      rule = await addRule({
        isActive: true,
        channels: ['channel1', 'channel2'],
        options: {
          failureThreshold: 1,
        },
      });
    });

    async function generateAlert(): Promise<string> {
      const result = await postFailure(rule);
      return result.alertId;
    }

    it('should reset alert', async () => {
      const alertId = await generateAlert();

      const now = clock.getTime();
      const resetResult = await RuleScripts.resetAlert(
        queue,
        rule,
        alertId,
        now,
      );
      expect(resetResult).toBe(true);

      const alert = await getAlert(rule, alertId);
      expect(alert.status).toBe('closed');
      expect(alert.resetAt).toBe(now);
    });

    it('emits an event', async () => {
      let gotEvent = false;

      await bus.waitUntilReady();

      bus.on('alert.reset', (evt) => {
        gotEvent = true;
      });

      await delay(100);
      const alertId = await generateAlert();

      const now = clock.getTime();
      const wasReset = await RuleScripts.resetAlert(queue, rule, alertId, now);

      await delay(130);
      expect(gotEvent).toBe(true);
    });

    it('does not reset an already closed alert', async () => {
      const alertId = await generateAlert();
      await RuleScripts.resetAlert(queue, rule, alertId);

      const resetResult = await RuleScripts.resetAlert(queue, rule, alertId);
      expect(resetResult).toBe(false);
    });

    it('errors on an invalid alert', async () => {
      try {
        await RuleScripts.resetAlert(queue, rule, 'invalid');
        fail('should have thrown');
      } catch (e) {
        expect(e.message).toMatch(/alert not found/);
      }
    });
  });
});
