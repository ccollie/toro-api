import { EZContext } from 'graphql-ez';
import { FieldConfig, RuleTC } from '../index';
import boom from '@hapi/boom';
import { Rule } from '@alpen/core/rules';

export const rule: FieldConfig = {
  type: RuleTC,
  args: {
    queueId: 'ID!',
    ruleId: 'ID!',
  },
  async resolve(
    _,
    { queueId, ruleId },
    { accessors }: EZContext,
  ): Promise<Rule> {
    const manager = accessors.getQueueManager(queueId);
    const rule = await manager.getRule(ruleId);
    if (!rule) {
      // todo: throw on not found ?
      throw boom.notFound(`Cannot find rule for id#${ruleId}`);
    }
    return rule;
  },
};
