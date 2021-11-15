import { EZContext } from 'graphql-ez';
import { FieldConfig, RuleAddInputTC, RuleTC } from '../../index';
import { Rule } from '@alpen/core';
import { RuleAddInput } from '../../../typings';
import { convertCondition, translateSeverity } from './utils';

export const ruleAdd: FieldConfig = {
  type: RuleTC.NonNull,
  description: 'Create a rule for a queue',
  args: {
    input: RuleAddInputTC.NonNull,
  },
  async resolve(
    _,
    { input }: { input: RuleAddInput },
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
    const rule = await manager.addRule(ruleOptions);
    return rule;
  },
};
