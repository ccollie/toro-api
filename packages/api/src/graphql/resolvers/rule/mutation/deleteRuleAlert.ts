import { EZContext } from 'graphql-ez';
import { fieldsList } from 'graphql-fields-list';
import { FieldConfig, RuleTC } from '../../index';
import { schemaComposer } from 'graphql-compose';

export const DeleteRuleAlert: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'DeleteRuleAlertResult',
    fields: {
      ruleId: 'ID!',
      rule: RuleTC,
      isDeleted: 'Boolean!',
    },
  }).NonNull,
  description: 'Delete a rule alert',
  args: {
    input: schemaComposer.createInputTC({
      name: 'DeleteRuleAlertInput',
      fields: {
        queueId: 'ID!',
        ruleId: 'ID!',
        alertId: 'ID!',
      },
    }).NonNull,
  },
  async resolve(_: unknown, { input }, { accessors }: EZContext, info) {
    const { queueId, ruleId, alertId } = input;
    const fields = fieldsList(info);
    const manager = accessors.getQueueManager(queueId, true);
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