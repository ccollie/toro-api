import { Rule } from '@alpen/core';
import { EZContext } from 'graphql-ez';
import { CreateRuleInput } from '../../../typings';
import { CreateRuleInputTC, FieldConfig, RuleTC } from '../../index';
import { convertCondition, translateSeverity } from './utils';

export const createRule: FieldConfig = {
  type: RuleTC.NonNull,
  description: 'Create a rule for a queue',
  args: {
    input: CreateRuleInputTC.NonNull,
  },
  async resolve(
    _,
    { input }: { input: CreateRuleInput },
    { accessors }: EZContext,
  ): Promise<Rule> {
    const { queueId, severity, condition: cond, ...rest } = input;
    const manager = accessors.getQueueManager(queueId, true);
    const condition = convertCondition(cond);
    const ruleOptions = {
      queueId,
      condition,
      severity: translateSeverity(severity),
      ...rest,
    };
    return manager.addRule(ruleOptions);
  },
};
