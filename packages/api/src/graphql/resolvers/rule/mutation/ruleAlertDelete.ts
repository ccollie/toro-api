import { FieldConfig, RuleTC } from '../../index';
import { schemaComposer } from 'graphql-compose';
import { getQueueManager, getResolverFields } from '../../../helpers';

export const ruleAlertDelete: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'RuleAlertDeletePayload',
    fields: {
      ruleId: 'ID!',
      rule: RuleTC,
      isDeleted: 'Boolean!',
    },
  }).NonNull,
  description: 'Delete a rule alert',
  args: {
    input: schemaComposer.createInputTC({
      name: 'RuleAlertDeleteInput',
      fields: {
        queueId: 'ID!',
        ruleId: 'ID!',
        alertId: 'ID!',
      },
    }).NonNull,
  },
  async resolve(_: unknown, { input }, context, info) {
    const { queueId, ruleId, alertId } = input;
    const fields = getResolverFields(info);
    const manager = getQueueManager(queueId);
    const ruleManager = manager.ruleManager;
    const deleted = await ruleManager.deleteAlert(ruleId, alertId);
    if (!deleted) {
      // todo: throw boom.notFound();
    }
    const result = { ruleId, isDeleted: deleted };
    if (fields.includes('rule')) {
      (result as any).rule = await manager.getRule(ruleId);
    }
    return result;
  },
};
