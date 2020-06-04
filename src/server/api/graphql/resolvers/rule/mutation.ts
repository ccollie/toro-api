;import { getQueueManager } from '../helpers';
import { Rule } from '../../../../monitor';

// TODO: use queueBus to publish messages for subscription support
export const Mutation = {
  async createRule(_, args, context): Promise<any> {
    const { queueId, ...ruleConfig } = args;
    const manager = getQueueManager(context, queueId);
    const rule = await manager.addRule(ruleConfig);
    return { rule };
  },
  async deleteRule(_, { queueId, ruleId }, context): Promise<any> {
    const manager = getQueueManager(context, queueId);
    await manager.deleteRule(ruleId);
    return {};
  },
};
