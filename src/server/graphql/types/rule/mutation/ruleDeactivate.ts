import { FieldConfig, RuleTC } from '../../index';
import { schemaComposer } from 'graphql-compose';
import { getQueueManager, getResolverFields } from '../../../helpers';

export const ruleDeactivate: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'RuleDeactivatePayload',
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
      name: 'RuleDeactivateInput',
      fields: {
        queueId: 'ID!',
        ruleId: 'ID!',
      },
    }).NonNull,
  },
  async resolve(_: unknown, { queueId, id }, info) {
    const manager = getQueueManager(queueId);
    const fields = getResolverFields(info);
    const changed = await manager.ruleManager.setRuleStatus(id, false);
    const result: Record<string, any> = {};
    result.isActive = !changed;
    if (fields.includes('rule')) {
      result.rule = await manager.getRule(id);
    }
    return result;
  },
};
