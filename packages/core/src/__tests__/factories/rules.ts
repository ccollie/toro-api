import { getUniqueId, nanoid } from '../../ids';
import { Rule, defaultRuleAlertOptions } from '../../rules';
import { RuleConfigOptions, RuleType, RuleOperator } from '../../types';

export function createRuleOptions(
  options: Partial<RuleConfigOptions> = {},
): RuleConfigOptions {
  return {
    options: defaultRuleAlertOptions,
    name: 'rule-' + nanoid(),
    id: getUniqueId(),
    metricId: getUniqueId(),
    isActive: true,
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
