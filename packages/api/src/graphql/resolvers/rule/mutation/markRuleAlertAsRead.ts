import { EZContext } from 'graphql-ez';
import { FieldConfig, RuleAlertTC } from '../../index';
import { schemaComposer } from 'graphql-compose';

export const markRuleAlertAsRead: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'MarkRuleAlertAsReadResult',
    fields: {
      alert: RuleAlertTC.NonNull,
    },
  }).NonNull,
  description: 'Delete a rule alert',
  args: {
    input: schemaComposer.createInputTC({
      name: 'MarkRuleAlertAsReadInput',
      fields: {
        queueId: 'ID!',
        ruleId: 'ID!',
        alertId: 'ID!',
        isRead: 'Boolean!',
      },
    }).NonNull,
  },
  async resolve(_: unknown, { input }, { accessors }: EZContext) {
    const { queueId, ruleId, alertId, isRead } = input;
    const manager = accessors.getQueueManager(queueId, true);
    const ruleManager = manager.ruleManager;
    const alert = await ruleManager.markAlertAsRead(ruleId, alertId, isRead);
    return { alert };
  },
};
