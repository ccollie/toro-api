import { getQueueManager, getResolverFields, getRuleManager } from '../helpers';

async function changeActiveStatus(active: boolean, rule, args, context, info) {
  const { queueId, id } = args;
  const manager = getQueueManager(context, queueId);
  const fields = getResolverFields(info);
  const changed = await manager.ruleManager.setRuleStatus(id, active);
  const result: Record<string, any> = {};
  result.isActive = changed ? active : !active;
  if (fields.includes('rule')) {
    result.rule = manager.getRule(id);
  }

  return result;
}

async function activateRule(rule, args, context, info) {
  return changeActiveStatus(true, rule, args, context, info);
}

async function deactivateRule(rule, args, context, info) {
  return changeActiveStatus(false, rule, args, context, info);
}

async function deleteRuleAlert(_, { input }, context, info) {
  const { queueId, ruleId, alertId } = input;
  const fields = getResolverFields(info);
  const manager = getQueueManager(context, queueId);
  const ruleManager = manager.ruleManager;
  const deleted = await ruleManager.deleteAlert(ruleId, alertId);
  if (!deleted) {
    // todo: throw boom.notFound();
  }
  const result = { ruleId };
  if (fields.includes('rule')) {
    (result as any).rule = manager.getRule(ruleId);
  }
  return result;
}

async function clearRuleAlerts(_, { queueId, ruleId }, context) {
  const rules = getRuleManager(context, queueId);
  const queueManager = getQueueManager(context, queueId);
  const items = await rules.clearAlerts(ruleId);
  // todo: validate rule
  const rule = queueManager.getRule(ruleId);
  return {
    deletedItems: items,
    rule,
  };
}

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
  activateRule,
  deactivateRule,
  deleteRuleAlert,
  clearRuleAlerts,
};
