import { FieldConfig, RuleTC, RuleAddInputTC } from '../../index';
import { getQueueManager } from '../../../helpers';

export const ruleAdd: FieldConfig = {
  type: RuleTC.NonNull,
  description: 'Create a rule for a queue',
  args: {
    input: RuleAddInputTC.NonNull,
  },
  async resolve(_, args): Promise<any> {
    const { queueId, ...options } = args;
    const manager = getQueueManager(queueId);
    return manager.addRule(options);
  },
};
