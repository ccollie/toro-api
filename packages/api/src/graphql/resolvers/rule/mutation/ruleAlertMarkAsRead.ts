import { FieldConfig, RuleAlertTC } from '../../index';
import { schemaComposer } from 'graphql-compose';
import { getQueueManager } from '../../../helpers';

export const ruleAlertMarkAsRead: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'RuleAlertMarkAsReadPayload',
    fields: {
      alert: RuleAlertTC.NonNull,
    },
  }).NonNull,
  description: 'Delete a rule alert',
  args: {
    input: schemaComposer.createInputTC({
      name: 'RuleAlertMarkAsReadInput',
      fields: {
        queueId: 'ID!',
        ruleId: 'ID!',
        alertId: 'ID!',
        isRead: 'Boolean!',
      },
    }).NonNull,
  },
  async resolve(_: unknown, { input }) {
    const { queueId, ruleId, alertId, isRead } = input;
    const manager = getQueueManager(queueId);
    const ruleManager = manager.ruleManager;
    const alert = await ruleManager.markAlertAsRead(ruleId, alertId, isRead);
    return { alert };
  },
};
