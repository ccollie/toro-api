import { FieldConfig, RuleTC } from '../../index';
import { schemaComposer } from 'graphql-compose';
import { getQueueManager, getRuleManager } from '../../../helpers';

export const ruleAlertClear: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'RuleAlertsClearPayload',
    fields: {
      deletedItems: {
        type: 'Int!',
        description: 'The count of deleted alerts',
      },
      rule: RuleTC.NonNull,
    },
  }),
  description: 'Removes all alerts associated with a rule',
  args: {
    input: schemaComposer.createInputTC({
      name: 'RuleAlertsClearInput',
      fields: {
        queueId: 'ID!',
        ruleId: 'ID!',
      },
    }).NonNull,
  },
  async resolve(_: unknown, { input }) {
    const { queueId, ruleId } = input;
    const rules = getRuleManager(queueId);
    const queueManager = getQueueManager(queueId);
    const items = await rules.clearAlerts(ruleId);
    // todo: validate rule
    const rule = await queueManager.getRule(ruleId);
    return {
      deletedItems: items,
      rule,
    };
  },
};
