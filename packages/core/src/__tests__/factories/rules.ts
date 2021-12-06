import { getUniqueId, nanoid } from '../../ids';
import {
  Rule,
  RuleConfigOptions,
  RuleType,
  RuleOperator,
  defaultRuleAlertOptions,
} from '../../rules';

export function createRuleOptions(
  options: Partial<RuleConfigOptions> = {},
): RuleConfigOptions {
  return {
    options: defaultRuleAlertOptions,
    name: 'rule-test-' + nanoid(),
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
