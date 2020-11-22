import { FieldConfig } from '../../utils';
import { getQueueManager } from '../../../helpers';
import { Queue } from 'bullmq';
import { Rule } from '../../../../rules';
import { RuleTC } from '../../rule/model/Rule';

export const queueRules: FieldConfig = {
  args: {},
  type: RuleTC.NonNull.List.NonNull,
  resolve(queue: Queue): Rule[] {
    const manager = getQueueManager(queue);
    return manager.rules;
  },
};
