import { FieldConfig, RuleTC } from '../../index';
import { schemaComposer } from 'graphql-compose';
import { getQueueManager, getResolverFields } from '../../../helpers';

export const ruleActivate: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'RuleActivatePayload',
    fields: {
      isActive: {
        type: 'Boolean!',
      },
      rule: RuleTC.NonNull,
    },
  }),
  description: 'Removes all alerts associated with a rule',
  args: {
    input: schemaComposer.createInputTC({
      name: 'RuleActivateInput',
      fields: {
        queueId: 'ID!',
        ruleId: 'ID!',
      },
    }).NonNull,
  },
  async resolve(_: unknown, { queueId, id }, info) {
    const manager = getQueueManager(queueId);
    const fields = getResolverFields(info);
    const changed = await manager.ruleManager.setRuleStatus(id, true);
    const result: Record<string, any> = {};
    result.isActive = changed;
    if (fields.includes('rule')) {
      result.rule = await manager.getRule(id);
    }
    return result;
  },
};
