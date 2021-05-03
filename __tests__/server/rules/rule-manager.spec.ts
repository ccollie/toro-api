import {
  ErrorLevel,
  QueueConfig,
  RuleAlert,
  RuleCondition,
  RuleConfigOptions,
  RuleEventsEnum,
  RuleMetric,
  RuleOperator,
  RuleState,
  RuleType,
} from '../../../src/types';
import { Rule, RuleManager } from '../../../src/server/rules';
import {
  getUniqueId,
  HostManager,
  NotificationManager,
  QueueManager,
} from '../common';
import { delay, randomString } from '../utils';
import {
  clearDb,
  createHostManager,
  createRule,
  createRuleOptions,
  QueueListenerHelper,
} from '../../factories';

function createAlert(rule, data = {}): RuleAlert {
  return {
    id: getUniqueId(),
    value: 201,
    status: 'open',
    errorLevel: ErrorLevel.CRITICAL,
    ruleId: rule.id,
    raisedAt: Date.now(),
    state: {},
    severity: undefined,
    failures: 0,
    ...data,
  };
}

describe('RuleManager', () => {
  // jest.setTimeout(5000);
  let ruleManager: RuleManager;
  let listenerHelper: QueueListenerHelper;
  let hostManager: HostManager;
  let queueManager: QueueManager;
  let notifications: NotificationManager;

  beforeEach(async function () {
    const queueName = 'test-' + randomString(5);
    const queueConfig: QueueConfig = {
      name: queueName,
      prefix: 'bull',
    };

    hostManager = createHostManager({
      queues: [queueConfig],
    });
    await hostManager.waitUntilReady();

    notifications = hostManager.notifications;
    queueManager = hostManager.getQueueManager(queueName);
    ruleManager = new RuleManager(queueManager);
    listenerHelper = new QueueListenerHelper(ruleManager.queueListener);
  });

  afterEach(async function () {
    await clearDb(hostManager.client);
    await Promise.all([queueManager.destroy(), hostManager.destroy()]);
  });

  async function getLastAlert(rule: Rule): Promise<RuleAlert> {
    return ruleManager.storage.getAlert(rule, '+');
  }

  function addRule(data?: Partial<RuleConfigOptions>): Promise<Rule> {
    const opts: RuleConfigOptions = createRuleOptions(data);
    return ruleManager.addRule(opts);
  }

  async function postJob(
    options?: Record<string, any>,
    needDelay = true,
  ): Promise<void> {
    await listenerHelper.postCompletedEvent(options);
    if (needDelay) {
      await delay(40);
    }
  }

  describe('.addRule', () => {
    it('should store a Rule', async () => {
      const opts: RuleConfigOptions = createRuleOptions();
      const rule = new Rule(opts);
      const savedRule = await ruleManager.addRule(opts);
      const expected = rule.toJSON();
      const actual = savedRule.toJSON();
      expect(expected).toMatchObject(actual);
      expect(savedRule.id).not.toBeUndefined();
    });

    it('should store a rule expressed as an object', async () => {
      const opts = createRuleOptions();
      const rule = await ruleManager.addRule(opts);
      expect(rule).toBeInstanceOf(Rule);
      expect(rule.id).not.toBeUndefined();
    });

    it('should add the rule id to the rule index', async () => {
      const rule = await addRule();
      const client = hostManager.client;
      const score = await client.zscore(
        ruleManager.storage.rulesIndexKey,
        rule.id,
      );
      expect(score).toBeDefined();
      expect(score).toBe('' + rule.createdAt);
    });

    it(`should emit a "${RuleEventsEnum.RULE_ADDED}" event`, async () => {
      let eventData = null;

      hostManager.bus.on(RuleEventsEnum.RULE_ADDED, (evt) => {
        eventData = evt;
      });

      const rule = await addRule();
      await delay(50);
      expect(eventData).not.toBeUndefined();
      expect(eventData.ruleId).toEqual(rule.id);
    });
  });

  describe('.deleteRule', () => {
    it('should delete a rule expressed as an object', async () => {
      const rule = await addRule();
      const deleted = await ruleManager.deleteRule(rule);
      expect(deleted).toBe(true);
    });

    it('should delete a rule by id', async () => {
      const rule = await addRule();
      const deleted = await ruleManager.deleteRule(rule.id);
      expect(deleted).toBe(true);
    });

    it('should emit a "rule.deleted" event', async () => {
      let eventData = null;

      hostManager.bus.on(RuleEventsEnum.RULE_DELETED, (evt) => {
        eventData = evt;
      });
      const rule = await addRule();
      await ruleManager.deleteRule(rule);
      await delay(150);
      expect(eventData).not.toBeUndefined();
      expect(eventData.ruleId).toEqual(rule.id);
    });

    it('should remove the associated metric', async () => {
      const rule = await addRule();
      const listener = ruleManager.metricsListener;
      expect(listener.metrics.length).toBe(1);

      await ruleManager.deleteRule(rule.id);
      expect(listener.metrics.length).toBe(0);
    });
  });

  describe('.updateRule', () => {
    it('should update properties', async () => {
      const rule = await addRule();
      rule.isActive = !rule.isActive;
      rule.channels = ['slack'];
      rule.payload = { number: 1, string: randomString(), bool: false };
      const saveProps = rule.toJSON();

      await ruleManager.updateRule(rule);
      const updated = await ruleManager.getRule(rule.id);
      const newProps = updated.toJSON();

      // ignore updatedAt
      newProps['updatedAt'] = saveProps['updatedAt'];

      expect(newProps).toStrictEqual(saveProps);
    });

    // TODO: check that event is raised
  });

  describe('.getRule', () => {
    it('can get a rule by id', async () => {
      const rule = await addRule();
      // bypass cached value
      const actual = await ruleManager.storage.getRule(rule.id);

      expect(actual.id).toBe(rule.id);
      expect(actual.name).toBe(rule.name);
      expect(actual.createdAt).toBe(rule.createdAt);
      expect(actual.updatedAt).toBe(rule.updatedAt);
      // expect(actual.options).toStrictEqual(rule.options);
      expect(actual.metric).toStrictEqual(rule.metric);
      expect(actual.condition).toStrictEqual(rule.condition);
      expect(actual.payload).toStrictEqual(rule.payload);
      expect(actual.isActive).toBe(rule.isActive);
      expect(actual.message).toBe(rule.message);
      expect(actual.channels).toStrictEqual(rule.channels);
    });
  });

  describe('.getRules', () => {
    async function createRules(count = 5): Promise<void> {
      for (let i = 0; i < count; i++) {
        const opts = {
          id: 'rule-' + i,
          description: `description-${i}`,
        };
        await addRule(opts);
      }
    }

    it('should get rules', async () => {
      await createRules(5);
      const rules = await ruleManager.getRules();
      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBe(5);
      rules.forEach((rule) => {
        expect(rule).toBeInstanceOf(Rule);
      });
    });

    it('should sort rules', async () => {
      await createRules(5);
      const rules = await ruleManager.getRules('id', false);

      let oldId = rules[0].id;
      for (let i = 1; i < rules.length; i++) {
        const currentId = rules[i].id;
        expect(oldId > currentId).toBe(true);
        oldId = currentId;
      }
    });
  });

  describe('.setRuleStatus', () => {
    it('updates the ACTIVE status', async () => {
      const rule = await addRule();
      const oldActive = rule.isActive;
      const newActive = await ruleManager.setRuleStatus(rule, !oldActive);
      expect(newActive).not.toBe(oldActive);
    });
  });

  describe('.addAlert', () => {
    it('stores an alert to redis', async () => {
      const rule = createRule();
      const alert = createAlert(rule);

      const stored = await ruleManager.addAlert(rule, alert);
      const fromRedis = await getLastAlert(rule);
      expect(stored).toStrictEqual(fromRedis);
    });
  });

  describe('.deleteAlert', () => {
    it('deletes an alert from redis', async () => {
      const rule = createRule();
      const alert = createAlert(rule);

      const spy = jest.spyOn(ruleManager.storage, 'deleteAlert');
      const stored = await ruleManager.addAlert(rule, alert);

      let fromRedis = await getLastAlert(rule);
      expect(fromRedis.id).toEqual(alert.id);

      await ruleManager.deleteAlert(rule, alert.id);

      fromRedis = await getLastAlert(rule);
      expect(fromRedis).toBeFalsy();

      expect(stored).not.toBeUndefined();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Alerts', () => {
    const ERROR_TRIGGER_VALUE = 2000;
    const WARNING_TRIGGER_VALUE = ERROR_TRIGGER_VALUE - 1000;
    const RESET_VALUE = WARNING_TRIGGER_VALUE - 100;

    const condition: RuleCondition = {
      type: RuleType.THRESHOLD,
      errorThreshold: ERROR_TRIGGER_VALUE - 100,
      warningThreshold: WARNING_TRIGGER_VALUE - 100,
      operator: RuleOperator.gt,
    };

    const metric: RuleMetric = {
      type: 'latency',
      options: {},
    };

    beforeEach(() => {});

    const TriggerData = { latency: ERROR_TRIGGER_VALUE };
    const WarningTriggerData = { latency: WARNING_TRIGGER_VALUE };
    const ResetData = { latency: RESET_VALUE };

    async function trigger() {
      return postJob(TriggerData);
    }

    async function triggerWarning() {
      return postJob(WarningTriggerData);
    }

    async function reset() {
      return postJob(ResetData);
    }

    describe('redis', () => {
      it('stores alerts to redis when an error is triggered', async () => {
        const rule = await addRule({ metric, condition });

        await trigger();
        const alert = await getLastAlert(rule);
        expect(alert).not.toBe(null);
        expect(alert.status).toBe('open');
        expect(alert.severity).toBe(rule.severity);
        expect(alert.value).toBe(ERROR_TRIGGER_VALUE);
        expect(alert.errorLevel).toBe(ErrorLevel.CRITICAL);
      });

      it('stores an alert to redis when a warning is triggered', async () => {
        const rule = await addRule({ metric, condition });

        await triggerWarning();
        const alert = await getLastAlert(rule);
        expect(alert).not.toBe(null);
        expect(alert.status).toBe('open');
        expect(alert.severity).toBe(rule.severity);
        expect(alert.value).toBe(WARNING_TRIGGER_VALUE);
        expect(alert.errorLevel).toBe(ErrorLevel.WARNING);
      });

      it('updates alert in redis when a rule is reset', async () => {
        const options = {
          alertOnReset: true,
        };
        const rule = await addRule({ metric, condition, options });

        await trigger();
        const alert = await getLastAlert(rule);
        expect(alert.status).toBe('open');

        await delay(10);
        await reset();

        const fromRedis = await ruleManager.getAlert(rule, alert.id);
        expect(fromRedis.status).toBe('close');
        expect(fromRedis.raisedAt).toBeDefined();
        expect(fromRedis.raisedAt).toBeGreaterThan(alert.raisedAt);
      });

      it('updates the rule status on state change', async () => {
        const options = {
          alertOnReset: true,
        };
        const rule = await addRule({ metric, condition, options });

        expect(rule.state).toBe(RuleState.NORMAL);

        await trigger();
        let fromRedis = await ruleManager.getRule(rule.id);
        expect(rule.state).toBe(RuleState.ERROR);
        expect(fromRedis.state).toBe(RuleState.ERROR);

        await reset();
        fromRedis = await ruleManager.getRule(rule.id);
        expect(rule.state).toBe(RuleState.NORMAL);
        expect(fromRedis.state).toBe(RuleState.NORMAL);
      });
    });

    it('sends an alert notification when triggered', async () => {
      const channels = ['email', 'slack'];
      const rule = await addRule({ metric, condition, channels });

      let alert: RuleAlert;
      await ruleManager.onAlertTriggered(rule.id, (data: RuleAlert) => {
        alert = data;
      });
      const spy = jest.spyOn(notifications, 'dispatch');
      await trigger();

      expect(spy).toHaveBeenCalledWith(
        RuleEventsEnum.ALERT_TRIGGERED,
        alert,
        channels,
      );
    });

    it('sends an alert notification on reset', async () => {
      const channels = ['email', 'slack'];
      const rule = await addRule({
        channels,
        metric,
        condition,
        options: {
          alertOnReset: true,
        },
      });

      await trigger();

      const spy = jest.spyOn(notifications, 'dispatch');

      await delay(10);
      await reset();

      const alert = getLastAlert(rule);

      expect(spy).toHaveBeenCalledWith(
        RuleEventsEnum.ALERT_RESET,
        alert,
        channels,
      );
    });
  });

  describe('Rule State Change', () => {
    const condition: RuleCondition = {
      type: RuleType.THRESHOLD,
      errorThreshold: 1000,
      warningThreshold: 500,
      operator: RuleOperator.gt,
    };

    const metric: RuleMetric = {
      type: 'latency',
      options: {},
    };

    const TriggerData = { latency: 2000 };

    it('emits an event bus event on states change', async () => {
      const channels = ['email', 'slack'];
      const rule = await addRule({ metric, condition, channels });

      let stateData;

      ruleManager.bus.on(RuleEventsEnum.STATE_CHANGED, (eventData) => {
        stateData = eventData;
      });

      await postJob(TriggerData);
      expect(stateData.state).toBe(RuleState.ERROR);

      await postJob({ latency: 10 });
      // expect(spy).toHaveBeenCalledTimes(3);
      expect(stateData.state).toBe(RuleState.NORMAL);

      await postJob({ latency: 700 });
      expect(stateData.state).toBe(RuleState.WARNING);
    });
  });

  describe('Queue Events', () => {
    const condition: RuleCondition = {
      type: RuleType.THRESHOLD,
      errorThreshold: 1000,
      operator: RuleOperator.gt,
    };

    const metric: RuleMetric = {
      type: 'latency',
      options: {},
    };

    const TriggerData = { latency: 2000 };
    const ResetData = { latency: 500 };

    it('posts a message when a rule is triggered', async () => {
      const channels = ['email', 'slack'];
      const rule = await addRule({ metric, condition, channels });

      let alert: RuleAlert = null;
      await ruleManager.onAlertTriggered(rule.id, (data: RuleAlert) => {
        alert = data;
      });
      await postJob(TriggerData);
      expect(alert).not.toBe(null);
      expect(alert.id).toBeDefined();
    });

    it('posts a message when a rule is reset', async () => {
      const rule = await addRule({ metric, condition });

      let alert: RuleAlert = null;
      await ruleManager.onAlertTriggered(rule.id, (data: RuleAlert) => {
        alert = data;
      });

      await postJob(TriggerData);

      expect(alert).not.toBe(null);
      expect(alert.id).toBeDefined();
    });
  });
});
