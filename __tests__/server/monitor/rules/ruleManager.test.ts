import { RuleConfigOptions } from '@src/types';
import { removeAllQueueData } from '@src/server/models/queues';
import { Rule, RuleManager } from '@src/server/monitor/rules';
import { QueueBus } from '@src/server/monitor/queues';
import { LockManager } from '@src/server/monitor/lib/lockManager';
import { RedisStreamAggregator } from '@src/server/redis/streamAggregator';
import { randomId, randomString, delay, createClient } from '../../utils';
import nanoid from 'nanoid';
import { Queue } from 'bullmq';
import { defaultRuleAlertOptions } from '@src/server/monitor/rules/rule-config';

describe('RuleManager', () => {
  // jest.setTimeout(5000);
  const host = 'localhost';
  let queue;
  let client;
  let queueListener;
  let queueName;
  let bus;
  let lockMgr;
  let aggregator;
  let ruleManager;

  function createRule(options = {}): Rule {
    const opts: RuleConfigOptions = {
      options: defaultRuleAlertOptions,
      name: 'Rule name ' + randomString(6),
      id: randomId(),
      condition: {
        wait: { $gte: 400 },
      },
      ...options,
    };

    return new Rule(opts);
  }

  beforeEach(async function () {
    queueName = 'test-' + nanoid(10);
    client = await createClient();
    queue = new Queue(queueName, { connection: client });
    aggregator = new RedisStreamAggregator();
    await aggregator.connect();
    lockMgr = new LockManager(client, 'localhost');
    bus = new QueueBus(aggregator, queue, host);
    ruleManager = new RuleManager(host, queue, bus);
  });

  afterEach(async function () {
    bus.destroy();
    lockMgr.destroy();
    aggregator.destroy();
    queueListener.destroy();
    await removeAllQueueData(client, queueName);
    await queue.close();
  });

  function addRule(data = {}) {
    const opts = {
      name: 'rule-test-' + randomString(5),
      condition: {
        wait: { $lte: 1000 },
      },
      description: 'description-' + randomString(5),
      ...data,
    };
    return ruleManager.addRule(opts);
  }

  describe('addRule', () => {
    it('should store a Rule', async () => {
      const opts: RuleConfigOptions = {
        id: nanoid(),
        options: undefined,
        name: 'rule-test-' + randomString(5),
        condition: {
          wait: { $lte: 1000 },
        },
        description: 'description',
      };
      const rule = new Rule(opts);
      const savedRule = await ruleManager.addRule(rule);
      expect(savedRule).toEqual(rule);
      expect(savedRule.id).not.toBeUndefined();
    });

    it('should store a rule expressed as an object', async () => {
      const opts = {
        name: 'rule-test-' + randomString(5),
        condition: {
          wait: { $lte: 1000 },
        },
        description: 'description',
      };
      const rule = await ruleManager.addRule(opts);
      expect(rule).toBeInstanceOf(Rule);
      expect(rule.id).not.toBeUndefined();
    });

    it('should add the rule id to the rule index', async () => {
      const rule = await addRule();
      const score = await client.zscore(ruleManager.rulesIndexKey, rule.id);
      expect(score).toBeDefined();
      expect(score).toBe('' + rule.createdAt);
    });

    it('should emit a "rule.added" event', async () => {
      let eventData;
      await bus.on('rule.added', (evt) => {
        eventData = evt;
      });
      const rule = await addRule();
      await delay(50);
      expect(eventData).not.toBeUndefined();
      expect(eventData.rid).toEqual(rule.id);
    });
  });

  describe('deleteRule', () => {
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

      await bus.on('rule.deleted', (evt) => {
        eventData = evt;
      });
      const rule = await addRule();
      await ruleManager.deleteRule(rule);
      await delay(50);
      expect(eventData).not.toBeUndefined();
      expect(eventData.rid).toEqual(rule.id);
    });
  });

  describe('getRule', () => {
    it('should get a rule by id', async () => {
      const id = randomString(5);
      const savedRule = await addRule({ id });

      const rule = await ruleManager.getRule(id);
      expect(rule).toBeInstanceOf(Rule);

      const original = savedRule.toJSON();
      const retrieved = rule.toJSON();

      expect(original).toStrictEqual(retrieved);
    });
  });

  describe('updateRule', () => {
    it('should update properties', async () => {
      const rule = await addRule();
      rule.active = !rule.active;
      rule.persist = !rule.persist;
      rule.notifiers = ['slack'];
      rule.payload = { number: 1, string: randomString(), bool: false };
      const saveProps = rule.toJSON();

      await ruleManager.updateRule(rule);
      const updated = await ruleManager.getRule(rule.id);
      const newProps = updated.toJSON();

      expect(newProps).toStrictEqual(saveProps);
    });

    // TODO: check that event is raised
  });

  describe('getRules', () => {
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

  describe('Alerts', () => {
    function createAlert(rule, data = {}) {
      return {
        event: 'alert.triggered',
        name: rule.name,
        description: rule.description,
        start: Date.now(),
        state: {},
        payload: rule.payload,
        ...data,
      };
    }

    describe('addAlert', () => {
      jest.setTimeout(10000);

      it('can add an alert', async () => {
        const rule = await addRule();
        const alert = createAlert(rule);

        const id = await ruleManager.addAlert(rule, 'alert.triggered', alert);
        expect(id).toBeDefined();
        // todo: load

        const stored = await ruleManager.getAlert(rule, id);
        expect(stored).toBeDefined();
      });

      it('raised the "alert.added" event', () => {
        // TODO:
      });
    });
  });
});
