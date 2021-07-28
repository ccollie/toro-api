import { randomString } from '../utils';
import { getUniqueId } from '../../src';
import {
  Rule,
  RuleConfigOptions,
  RuleType,
  RuleOperator,
  defaultRuleAlertOptions,
} from '../../src/rules';

export function createRuleOptions(
  options: Partial<RuleConfigOptions> = {},
): RuleConfigOptions {
  return {
    options: defaultRuleAlertOptions,
    name: 'rule-test-' + randomString(5),
    id: getUniqueId(),
    metricId: getUniqueId(),
    condition: {
      type: RuleType.THRESHOLD,
      errorThreshold: 20,
      operator: RuleOperator.GT,
    },
    ...options,
  };
}

export function createRule(options?: Partial<RuleConfigOptions>): Rule {
  const opts = createRuleOptions(options);
  return new Rule(opts);
}
