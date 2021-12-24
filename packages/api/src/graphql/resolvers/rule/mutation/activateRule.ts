import { EZContext } from 'graphql-ez';
import { fieldsList } from 'graphql-fields-list';
import { FieldConfig, RuleTC } from '../../index';
import { schemaComposer } from 'graphql-compose';

export const activateRule: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'ActivateRuleResult',
    fields: {
      isActive: {
        type: 'Boolean!',
      },
      rule: RuleTC.NonNull,
    },
  }).NonNull,
  description: 'Removes all alerts associated with a rule',
  args: {
    input: schemaComposer.createInputTC({
      name: 'ActivateRuleInput',
      fields: {
        queueId: 'ID!',
        ruleId: 'ID!',
      },
    }).NonNull,
  },
  async resolve(_: unknown, { queueId, id }, { accessors }: EZContext, info) {
    const manager = accessors.getQueueManager(queueId, true);
    const fields = fieldsList(info);
    const changed = await manager.ruleManager.setRuleStatus(id, true);
    const result: Record<string, any> = {};
    result.isActive = changed;
    if (fields.includes('rule')) {
      result.rule = await manager.getRule(id);
    }
    return result;
  },
};
