import { randomString } from '../server/utils';
import {
  defaultRuleAlertOptions,
  getUniqueId,
  Rule,
  RuleConfigOptions,
  RuleOperator,
  RuleType,
} from '../server/common';

export function createRuleOptions(
  options: Partial<RuleConfigOptions> = {},
): RuleConfigOptions {
  return {
    options: defaultRuleAlertOptions,
    name: 'rule-test-' + randomString(5),
    id: getUniqueId(),
    metric: {
      type: 'latency',
      options: {},
    },
    condition: {
      type: RuleType.THRESHOLD,
      errorThreshold: 20,
      operator: RuleOperator.gt,
    },
    ...options,
  };
}

export function createRule(options?: Partial<RuleConfigOptions>): Rule {
  const opts = createRuleOptions(options);
  return new Rule(opts);
}