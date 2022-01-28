import { Rule, RuleConfigOptions } from '@alpen/core';
import { parseDuration } from '@alpen/shared';
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
    const { queueId, severity, condition: cond, name, options, ...rest } = input;
    const { triggerDelay, notifyInterval, recoveryWindow, ...optionsRest } = options;
    const manager = accessors.getQueueManager(queueId, true);
    const condition = convertCondition(cond);
    const ruleOptions: RuleConfigOptions = {
      name,
      condition,
      options: {
        ...optionsRest,
        ...(triggerDelay && { triggerDelay: parseDuration(triggerDelay) }),
        ...(notifyInterval && { notifyInterval: parseDuration(notifyInterval) }),
        ...(recoveryWindow && { recoveryWindow: parseDuration(recoveryWindow) }),
      },
      severity: translateSeverity(severity),
      ...rest
    };
    return manager.addRule(ruleOptions);
  },
};
