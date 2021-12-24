import { EZContext } from 'graphql-ez';
import { FieldConfig, RuleTC } from '../../index';
import { schemaComposer } from 'graphql-compose';

export const clearRuleAlerts: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'ClearRuleAlertsResult',
    fields: {
      deletedItems: {
        type: 'Int!',
        description: 'The count of deleted alerts',
      },
      rule: RuleTC.NonNull,
    },
  }).NonNull,
  description: 'Removes all alerts associated with a rule',
  args: {
    input: schemaComposer.createInputTC({
      name: 'ClesrRuleAlertsInput',
      fields: {
        queueId: 'ID!',
        ruleId: 'ID!',
      },
    }).NonNull,
  },
  async resolve(_: unknown, { input }, { accessors }: EZContext) {
    const { queueId, ruleId } = input;
    const rules = accessors.getQueueRuleManager(queueId);
    const queueManager = accessors.getQueueManager(queueId, true);
    const items = await rules.clearAlerts(ruleId);
    // todo: validate rule
    const rule = await queueManager.getRule(ruleId);
    return {
      deletedItems: items,
      rule,
    };
  },
};
