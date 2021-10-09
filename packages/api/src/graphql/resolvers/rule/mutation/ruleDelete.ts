import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../index';
import { schemaComposer } from 'graphql-compose';

interface RuleDeletePayload {
  queueId: string;
  ruleId: string;
  isDeleted: boolean;
}

export const ruleDelete: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'RuleDeletePayload',
    fields: {
      ruleId: 'ID!',
      queueId: 'ID!',
      isDeleted: 'Boolean!',
    },
  }).NonNull,
  description: 'Delete a rule',
  args: {
    input: schemaComposer.createInputTC({
      name: 'RuleDeleteInput',
      fields: {
        queueId: 'ID!',
        ruleId: 'ID!',
      },
    }).NonNull,
  },
  async resolve(
    _: unknown,
    { input },
    { accessors }: EZContext,
  ): Promise<RuleDeletePayload> {
    const { queueId, ruleId } = input;
    const manager = accessors.getQueueManager(queueId);
    const isDeleted = await manager.deleteRule(ruleId);
    return {
      queueId,
      ruleId,
      isDeleted,
    };
  },
};
