'use strict';
import { random } from 'lodash';
import { randomString } from '../utils';
import { Rule } from '../../../src/server/rules';
import {
  ChangeAggregationType,
  ChangeTypeEnum,
  RuleCondition,
  RuleConfigOptions,
  RuleOperator,
  RuleType,
} from '../../../src/types';
import { getUniqueId } from '../../../src/server/lib';

describe('Rule', () => {
  function createRule(options: Partial<RuleConfigOptions> = {}): Rule {
    const opts: RuleConfigOptions = {
      metricId: getUniqueId(),
      name: 'Rule names ' + randomString(6),
      id: getUniqueId(),
      condition: {
        type: RuleType.THRESHOLD,
        operator: RuleOperator.gt,
        errorThreshold: 50,
      },
      ...options,
    };
    return new Rule(opts);
  }

  describe('constructor()', () => {
    it('can be initialized with condition and names', () => {
      const condition: RuleCondition = {
        type: RuleType.THRESHOLD,
        operator: RuleOperator.lt,
        errorThreshold: 40,
      };
      const opts = {
        condition,
        name: 'testName',
      };
      const rule = createRule(opts);
      expect(rule.condition).toStrictEqual(opts.condition);
      expect(rule.name).toBe(opts.name);
    });
  });

  describe('toJSON() and fromJSON()', () => {
    const metricId = getUniqueId();

    const condition: RuleCondition = {
      type: RuleType.CHANGE,
      changeType: ChangeTypeEnum.CHANGE,
      windowSize: 0,
      aggregationType: ChangeAggregationType.Avg,
      operator: RuleOperator.eq,
      errorThreshold: 10,
    };

    const name = 'testName';
    let rule: Rule;

    beforeEach(() => {
      const channels = [randomString(6), randomString(6)];
      rule = createRule({
        name,
        metricId,
        condition,
        description: 'description-' + randomString(4),
        message: randomString(),
        channels,
        payload: {
          number: random(0, 99),
          string: randomString(5),
        },
      });
    });

    it('serializes itself to JSON', () => {
      const json = rule.toJSON();
      expect(json.id).toBe(rule.id);
      expect(json.name).toBe(rule.name);
      expect(json.createdAt).toBe(rule.createdAt);
      expect(json.updatedAt).toBe(rule.updatedAt);
      // expect(json.options).toStrictEqual(rule.options);
      expect(json.metricId).toStrictEqual(metricId);
      expect(json.condition).toStrictEqual(condition);
      expect(json.payload).toStrictEqual(rule.payload);
      expect(json.active).toBe(rule.isActive);
      expect(json.message).toBe(rule.message);
      expect(json.channels).toStrictEqual(rule.channels);
    });

    it('rehydrates itself from JSON', () => {
      const json = rule.toJSON();
      const fromJson = Rule.fromJSON(json);

      expect(fromJson.id).toBe(rule.id);
      expect(fromJson.name).toBe(rule.name);
      expect(fromJson.createdAt).toBe(rule.createdAt);
      expect(fromJson.updatedAt).toBe(rule.updatedAt);
      // expect(json.options).toStrictEqual(rule.options);
      expect(fromJson.metricId).toBe(metricId);
      expect(fromJson.condition).toStrictEqual(condition);
      expect(fromJson.payload).toStrictEqual(rule.payload);
      expect(fromJson.isActive).toBe(rule.isActive);
      expect(fromJson.message).toBe(rule.message);
      expect(fromJson.channels).toStrictEqual(rule.channels);
    });
  });
});
