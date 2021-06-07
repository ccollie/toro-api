import { FieldConfig, RuleTC } from '../index';
import { getQueueManager } from '../../helpers';
import boom from '@hapi/boom';
import { Rule } from '../../../rules';

export const rule: FieldConfig = {
  type: RuleTC,
  args: {
    queueId: 'ID!',
    ruleId: 'ID!',
  },
  async resolve(_, { queueId, ruleId }): Promise<Rule> {
    const manager = getQueueManager(queueId);
    const rule = await manager.getRule(ruleId);
    if (!rule) {
      // todo: throw on not found ?
      throw boom.notFound(`Cannot find rule for id#${ruleId}`);
    }
    return rule;
  },
};
