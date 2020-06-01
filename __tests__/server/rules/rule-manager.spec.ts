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
  RuleType
} from '../../../src/types';
import { Rule, RuleManager, RuleStateChangeEvent } from '../../../src/server/rules';
import { getUniqueId, HostManager, QueueManager, } from '../common';
import { clearDb, delay, randomString } from '../utils';
import { createRule, createRuleOptions } from './utils';
import { QueueListenerHelper } from '../../fixtures';
import { createHostManager } from '../../fixtures/host-manager';

function createAlert(rule, data = {}): RuleAlert {
  return {
    id: getUniqueId(),
    threshold: 100,
    value: 201,
    event: RuleEventsEnum.ALERT_TRIGGERED,
    errorLevel: ErrorLevel.CRITICAL,
    name: rule.name,
    description: rule.description,
    start: Date.now(),
    state: {},
    severity: undefined,
    violations: 0,
    ...data
  };
}

describe('RuleManager', () => {
  // jest.setTimeout(5000);
  let ruleManager: RuleManager;
  let listenerHelper: QueueListenerHelper;
  let hostManager: HostManager;
  let queueManager: QueueManager;

  beforeEach(async function () {
    const queueName = 'test-' + randomString(5);
    const queueConfig: QueueConfig = {
      name: queueName,
      prefix: 'bull'
    };

    hostManager = createHostManager({
      queues: [ queueConfig ]
    });
    await hostManager.waitUntilReady();

    queueManager = hostManager.getQueueManager(queueName);
    ruleManager = new RuleManager(queueManager);
    listenerHelper = new QueueListenerHelper(ruleManager.queueListener);
  });

  afterEach(async function () {
    await clearDb(hostManager.client);
    await Promise.all([
      queueManager.destroy(),
      hostManager.destroy()
    ]);
  });

  function addRule(data?: Partial<RuleConfigOptions>): Promise<Rule> {
    const opts: RuleConfigOptions = createRuleOptions(data);
    return ruleManager.addRule(opts);
  }

  async function postJob(options?: Record<string, any>, needDelay = true): Promise<void> {
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
      const score = await client.zscore(ruleManager.storage.rulesIndexKey, rule.id);
      expect(score).toBeDefined();
      expect(score).toBe('' + rule.createdAt);
    });

    it(`should emit a "${RuleEventsEnum.RULE_ADDED}" event`, async () => {
      let eventData;
      await hostManager.bus.on(RuleEventsEnum.RULE_ADDED, (evt) => {
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
      let eventData;

      await hostManager.bus.on(RuleEventsEnum.RULE_DELETED, (evt) => {
        eventData = evt;
      });
      const rule = await addRule();
      await ruleManager.deleteRule(rule);
      await delay(150);
      expect(eventData).not.toBeUndefined();
      expect(eventData.ruleId).toEqual(rule.id);
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
    it('proxies to the internal storage class', async () => {
      const rule = createRule();
      const alert = createAlert(rule);

      const spy = jest.spyOn(ruleManager.storage, 'addAlert');
      const stored = await ruleManager.addAlert(rule, alert);
      expect(stored).not.toBeUndefined();
      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Alert notifications', () => {
    const condition: RuleCondition = {
      type: RuleType.THRESHOLD,
      errorThreshold: 1000,
      operator: RuleOperator.gt
    }

    const metric: RuleMetric = {
      type: 'latency',
      options: {}
    }

    const SuccessData = { latency: 2000 };
    const FailureData = { latency: 500 };

    it('sends an alert notification when triggered', async () => {
      const channels = ['email', 'slack'];
      const rule = await addRule({ metric, condition, channels });

      let alert: RuleAlert;
      rule.on(RuleEventsEnum.ALERT_TRIGGERED, (data: RuleAlert) => {
        alert = data;
      });
      const spy = jest.spyOn(ruleManager.notifications, 'dispatch');
      await postJob(SuccessData);

      expect(spy).toHaveBeenCalledWith(RuleEventsEnum.ALERT_TRIGGERED, alert, channels);
    });

    it('stores alerts to redis when triggered', async () => {
      const channels = ['email', 'slack'];
      const rule = await addRule({ metric, condition, channels });

      let alert: RuleAlert;
      rule.on(RuleEventsEnum.ALERT_TRIGGERED, (data: RuleAlert) => {
        alert = data;
      });
      const spy = jest.spyOn(ruleManager.storage, 'addAlert');
      await postJob(SuccessData);

      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('sends an alert notification on reset', async () => {
      const channels = ['email', 'slack'];
      const rule = await addRule({
        channels,
        metric,
        condition,
        options: {
          alertOnReset: true
        }
      });

      let alert: RuleAlert;
      rule.on(RuleEventsEnum.ALERT_RESET, (data: RuleAlert) => {
        alert = data;
      });

      await postJob(SuccessData);

      const spy = jest.spyOn(ruleManager.notifications, 'dispatch');

      await delay(10);
      await postJob(FailureData);

      expect(spy).toHaveBeenCalledWith(RuleEventsEnum.ALERT_RESET, alert, channels);
    });

    it('stores alerts to redis on reset', async () => {
      const channels = ['email', 'slack'];
      const options = {
        alertOnReset: true
      };
      const rule = await addRule({ metric, condition, channels, options });

      let alert: RuleAlert;
      rule.on(RuleEventsEnum.ALERT_RESET, (data: RuleAlert) => {
        alert = data;
      });
      await postJob(SuccessData);
      const spy = jest.spyOn(ruleManager.storage, 'addAlert');

      await delay(10);
      await postJob(FailureData);

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Rule State Change', () => {

    const condition: RuleCondition = {
      type: RuleType.THRESHOLD,
      errorThreshold: 1000,
      warningThreshold: 500,
      operator: RuleOperator.gt
    }

    const metric: RuleMetric = {
      type: 'latency',
      options: {}
    }

    const SuccessData = { latency: 2000 };

    it('emits an event bus event on states change', async () => {
      const channels = ['email', 'slack'];
      const rule = await addRule({ metric, condition, channels });

      let event: RuleStateChangeEvent;
      rule.on(RuleEventsEnum.STATE_CHANGED, (data: RuleStateChangeEvent) => {
        event = data;
      });

      let stateData;
      await ruleManager.bus.on(RuleEventsEnum.STATE_CHANGED, (eventData) => {
        stateData = eventData;
      });

      await postJob(SuccessData);
      expect(stateData.state).toBe(RuleState.ERROR);

      await postJob({ latency: 10 });
      // expect(spy).toHaveBeenCalledTimes(3);
      expect(stateData.state).toBe(RuleState.NORMAL);

      await postJob({ latency: 700 });
      expect(stateData.state).toBe(RuleState.WARNING);
    });

  })

});
