import crypto from 'crypto';
import nanoid from 'nanoid';
import { RuleConfigOptions, RuleOperator, RuleType } from '../../../../src/types';
import { defaultRuleAlertOptions, Rule } from '../../../../src/server/rules';

export * from '../../factories';

export function randomString(length = 10): string {
  return crypto.randomBytes(length).toString('hex');
}

export function randomId(len = 8): string {
  return nanoid(8);
}

export function createRuleOptions(options: Partial<RuleConfigOptions> = {}): RuleConfigOptions {
  return {
    options: defaultRuleAlertOptions,
    name: 'rule-test-' + randomString(5),
    id: randomId(),
    metric: {
      type: 'latency',
      options: {}
    },
    condition: {
      type: RuleType.THRESHOLD,
      errorThreshold: 20,
      operator: RuleOperator.gt
    },
    ...options,
  };
}

export function createRule(options?: Partial<RuleConfigOptions>): Rule {
  const opts = createRuleOptions(options);
  return new Rule(opts);
}

