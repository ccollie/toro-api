import { FieldConfig, RuleTC, RuleAddInputTC, QueueTC } from '../../index';
import { schemaComposer } from 'graphql-compose';
import { getQueueManager } from '../../../helpers';

export const ruleAdd: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'RuleAddPayload',
    fields: {
      rule: RuleTC.NonNull,
      queue: QueueTC.NonNull,
    },
  }),
  description: 'Create a rule for a queue',
  args: {
    input: RuleAddInputTC.NonNull,
  },
  async resolve(_, args): Promise<any> {
    const { queueId, ...options } = args;
    const manager = getQueueManager(queueId);
    const rule = await manager.addRule(options);
    return { rule, queue: manager.queue };
  },
};
