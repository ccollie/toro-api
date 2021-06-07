import { FieldConfig, RuleTC, RuleAddInputTC } from '../../index';
import { getQueueManager } from '../../../helpers';
import { Rule } from '../../../../rules';

export const ruleAdd: FieldConfig = {
  type: RuleTC.NonNull,
  description: 'Create a rule for a queue',
  args: {
    input: RuleAddInputTC.NonNull,
  },
  async resolve(_, { input }): Promise<Rule> {
    const { queueId, ...options } = input;
    const manager = getQueueManager(queueId);
    return manager.addRule(options);
  },
};

function convertCondition() {}
