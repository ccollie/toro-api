import { FieldConfig } from '../../utils';
import { Rule } from '../../../../rules';

export const ruleAlertCountFC: FieldConfig = {
  type: 'Int!',
  description: 'The total number of alerts raised for this rule',
  resolve(parent: Rule, args, { supervisor }): Promise<number> {
    const manager = supervisor.getQueueManager(parent.queueId);
    const ruleManager = manager.ruleManager;
    return ruleManager.getRuleAlertCount(parent);
  },
};
