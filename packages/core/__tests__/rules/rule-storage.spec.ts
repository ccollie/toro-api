import {
  ErrorLevel,
  RuleAlert,
  RuleConfigOptions,
  RuleEventsEnum,
  RuleOperator,
  RuleType,
} from '@alpen/core/rules';
import { Rule, RuleStorage } from '../../src/rules';
import { EventBus, getUniqueId, RedisStreamAggregator } from '../common';
import { getQueueBusKey } from '../../src/keys';
import { delay, randomString, randomId } from '../utils';
import { Queue, RedisClient } from 'bullmq';
import { random, sortBy } from 'lodash';
import pAll from 'p-all';
import {
  clearDb,
  createClient,
  createRuleOptions,
  DEFAULT_CONNECTION_OPTIONS,
} from '../factories';
import pSettle from 'p-settle';

describe('RuleStorage', () => {
  // jest.setTimeout(5000);
  let queue: Queue;
  let client: RedisClient;
  let queueName: string;
  let hostName: string;
  let bus: EventBus;
  let aggregator: RedisStreamAggregator;
  let storage: RuleStorage;

  beforeEach(async function () {
    queueName = `q-${randomId(6)}`;
    hostName = `host-${randomId(4)}`;
    client = await createClient();
    queue = new Queue(queueName, { connection: client });
    const opts = { connectionOptions: DEFAULT_CONNECTION_OPTIONS };
    aggregator = new RedisStreamAggregator(opts);
    bus = new EventBus(aggregator, getQueueBusKey(queue));
    storage = new RuleStorage(hostName, queue, bus);
    await bus.waitUntilReady();
  });

  afterEach(async function () {
    bus.destroy();
    await pSettle([aggregator.destroy(), clearDb(client)]);
    await queue.close();
  });

  function addRule(data = {}): Promise<Rule> {
    const opts: RuleConfigOptions = createRuleOptions(data);
    return storage.createRule(opts);
  }

  describe('.addRule', () => {
    it('stores a Rule', async () => {
      const opts: RuleConfigOptions = createRuleOptions();
      const rule = new Rule(opts);
      const savedRule = await storage.createRule(opts);
      const expected = rule.toJSON();
      const actual = savedRule.toJSON();
      // updatedAt is set on save, so ignore it in comparison
      expected.updatedAt = actual.updatedAt;
      // defer to the timestamp set by the storage
      expected.createdAt = actual.createdAt;

      expect(expected).toMatchObject(actual);
      expect(savedRule.id).not.toBeUndefined();
    });

    it('stores a rule expressed as an object', async () => {
      const opts = createRuleOptions();
      const rule = await storage.createRule(opts);
      expect(rule).toBeInstanceOf(Rule);
      expect(rule.id).not.toBeUndefined();
    });

    it('adds the rule id to the rule index', async () => {
      const rule = await addRule();
      const score = await client.zscore(storage.rulesIndexKey, rule.id);
      expect(score).not.toBeNull();
      const expected = parseFloat(score);
      expect(expected).toBeCloseTo(rule.createdAt, 13);
    });

    it('emits a "rule.added" event', async () => {
      let eventData;

      bus.on(RuleEventsEnum.RULE_ADDED, (evt) => {
        eventData = evt;
      });

      const rule = await addRule();
      await delay(450);
      expect(eventData).not.toBeUndefined();
      expect(eventData.ruleId).toEqual(rule.id);
    });
  });

  describe('.deleteRule', () => {
    it('deletes a rule expressed as an object', async () => {
      const rule = await addRule();
      const deleted = await storage.deleteRule(rule);
      expect(deleted).toBe(true);
    });

    it('deletes a rule by id', async () => {
      const rule = await addRule();
      const deleted = await storage.deleteRule(rule.id);
      expect(deleted).toBe(true);
    });

    it('emits a "rule.deleted" event', async () => {
      let eventData;

      bus.on(RuleEventsEnum.RULE_DELETED, (evt) => {
        eventData = evt;
      });
      const rule = await addRule();
      const deleted = await storage.deleteRule(rule);
      expect(deleted).toBe(true);
      await delay(150);
      expect(eventData).not.toBeUndefined();
      expect(eventData.ruleId).toEqual(rule.id);
    });

    it('removes the rule id from the rule index', async () => {
      const rule = await addRule();
      let score = await client.zscore(storage.rulesIndexKey, rule.id);
      expect(score).toBeDefined();
      await storage.deleteRule(rule);
      score = await client.zscore(storage.rulesIndexKey, rule.id);
      expect(score).toBe(null);
    });
  });

  describe('.getRule', () => {
    it('gets a rule by id', async () => {
      const id = getUniqueId();
      const savedRule = await addRule({ id });

      const rule = await storage.getRule(id);
      expect(rule).toBeInstanceOf(Rule);

      const original = savedRule.toJSON();
      const retrieved = rule.toJSON();
      original.updatedAt = retrieved.updatedAt;

      expect(original).toStrictEqual(retrieved);
    });
  });

  describe('.updateRule', () => {
    it('updates rule properties', async () => {
      const rule = await addRule();
      rule.isActive = !rule.isActive;
      rule.channels = ['slack'];
      rule.payload = { number: 1, string: randomString(), bool: false };
      const expected = rule.toJSON();

      await storage.saveRule(rule);
      const updated = await storage.getRule(rule.id);
      const actual = updated.toJSON();
      // ignore updatedAt
      expected.updatedAt = actual.updatedAt;

      expect(actual).toStrictEqual(expected);
    });

    // TODO: check that event is raised
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
      const rules = await storage.getRules();
      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBe(5);
      rules.forEach((rule) => {
        expect(rule).toBeInstanceOf(Rule);
      });
    });

    it('sorts rules', async () => {
      await createRules(5);
      const rules = await storage.getRules('id', false);

      let oldId = rules[0].id;
      for (let i = 1; i < rules.length; i++) {
        const currentId = rules[i].id;
        expect(oldId > currentId).toBe(true);
        oldId = currentId;
      }
    });
  });

  describe('Alerts', () => {
    function createAlert(rule, data: Partial<RuleAlert> = {}): RuleAlert {
      return {
        id: getUniqueId(),
        ruleId: rule.id,
        status: 'open',
        errorLevel: ErrorLevel.CRITICAL,
        value: 100,
        raisedAt: Date.now(),
        state: {
          ruleType: RuleType.THRESHOLD,
          errorThreshold: 100,
          errorLevel: ErrorLevel.CRITICAL,
          value: 110,
          comparator: RuleOperator.GT,
          unit: 'jobs/sec',
        },
        severity: data.severity,
        failures: 0,
        isRead: false,
        ...data,
      };
    }

    describe('.addAlert', () => {
      jest.setTimeout(10000);

      it('can add an alert', async () => {
        const rule = await addRule();
        const alert = createAlert(rule);

        const newAlert = await storage.addAlert(rule, alert);
        expect(newAlert).toBeDefined();

        const stored = await storage.getAlert(rule, newAlert.id);
        expect(stored).toBeDefined();
      });

      it('raises the "alert.triggered" event', async () => {
        let eventData;

        bus.on(RuleEventsEnum.ALERT_TRIGGERED, (evt) => {
          eventData = evt;
        });

        const rule = await addRule();
        const alert = createAlert(rule);

        const newAlert = await storage.addAlert(rule, alert);

        await delay(200);
        const stored = await storage.getAlert(rule, newAlert.id);

        expect(eventData).not.toBeUndefined();
        expect(eventData.ruleId).toEqual(rule.id);
      });

      it('updates an existing alert', async () => {
        let eventData;

        bus.on(RuleEventsEnum.ALERT_RESET, (evt) => {
          eventData = evt;
        });

        const rule = await addRule();
        const alert = createAlert(rule);

        await storage.addAlert(rule, alert);
        alert.resetAt = Date.now() + 1000;

        const newAlert = createAlert(rule, {
          errorLevel: ErrorLevel.NONE,
        });
        const updatedAlert = await storage.addAlert(rule, newAlert);

        await delay(200);
        expect(eventData).not.toBeUndefined();
        expect(eventData.ruleId).toEqual(rule.id);
      });
    });

    describe('.deleteAlert', () => {
      it('deletes an alert', async () => {
        const rule = await addRule();
        const alert = createAlert(rule);
        const saved = await storage.addAlert(rule, alert);

        const actual = await storage.deleteAlert(rule, saved.id);
        expect(actual).toBe(true);
      });

      it('raises an event on deletion', async () => {
        const rule = await addRule();
        const alert = createAlert(rule);
        const saved = await storage.addAlert(rule, alert);

        let eventData;

        bus.on(RuleEventsEnum.ALERT_DELETED, (evt) => {
          eventData = evt;
        });

        await storage.deleteAlert(rule, saved.id);
        await delay(200);

        expect(eventData).not.toBeUndefined();
        expect(eventData.ruleId).toEqual(rule.id);
      });
    });

    describe('.getAlert', () => {
      it('gets an alert by id', async () => {
        const rule = await addRule();
        const alert = createAlert(rule);
        const saved = await storage.addAlert(rule, alert);

        const actual = await storage.getAlert(rule, saved.id);
        expect(actual).toMatchObject(saved);
      });
    });

    describe('.getRuleAlerts', () => {
      function sortList(items: RuleAlert[]): RuleAlert[] {
        return sortBy(items, 'id');
      }

      async function addAlerts(
        rule: Rule,
        count?: number,
      ): Promise<RuleAlert[]> {
        const cnt = count ?? random(5, 10);
        const calls = [];
        for (let i = 0; i < cnt; i++) {
          const alert = createAlert(rule);
          calls.push(() => storage.addAlert(rule, alert));
        }

        const alerts = await pAll<RuleAlert>(calls);
        return sortList(alerts);
      }

      it('fetches all alerts if no parameters are specified', async () => {
        const rule = await addRule();
        const savedRules = await addAlerts(rule);
        let retrieved = await storage.getRuleAlerts(rule);
        retrieved = sortList(retrieved);

        expect(savedRules).toStrictEqual(retrieved);
      });
    });

    describe('.markAlertAsRead', () => {
      it('throws if an alert is not found', async () => {
        const rule = await addRule();
        const alert = createAlert(rule);

        const newAlert = await storage.addAlert(rule, alert);
        expect(newAlert).toBeDefined();

        await expect(
          storage.markAlertAsRead(rule, '12345', true),
        ).rejects.toEqual({
          payload: {
            error: 'Unable to locate alert id#"12345"',
          }
        });
      });

      it('marks an alert as read', async () => {
        const rule = await addRule();
        const alert = createAlert(rule);

        const newAlert = await storage.addAlert(rule, alert);
        expect(newAlert).toBeDefined();

        const modified = await storage.markAlertAsRead(rule, alert.id, true);
        expect(modified.id).toBe(newAlert.id);
        expect(modified.isRead).toBe(true);
      });

      it('marks an alert as unread', async () => {
        const rule = await addRule();
        const alert = createAlert(rule, { isRead: true });

        const newAlert = await storage.addAlert(rule, alert);
        expect(newAlert).toBeDefined();

        const modified = await storage.markAlertAsRead(rule, alert.id, false);
        expect(modified.id).toBe(newAlert.id);
        expect(modified.isRead).toBe(false);
      });

      it('raises an alert on state change', async () => {
        const rule = await addRule();
        const alert = createAlert(rule);

        await storage.addAlert(rule, alert);

        let eventData = null;

        bus.on(RuleEventsEnum.ALERT_UPDATED, (evt) => {
          eventData = evt;
        });

        await storage.markAlertAsRead(rule, alert.id, true);

        await delay(200);

        expect(eventData).not.toBeUndefined();
        expect(eventData.ruleId).toEqual(rule.id);
        expect(eventData.id).toEqual(alert.id);
        expect(typeof eventData.data).toBe('object');
        expect(eventData.data?.isRead).toBe(true);
      });
    });
  });
});
