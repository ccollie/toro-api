'use strict';
import boom from '@hapi/boom';
import { Rule, RuleAlert } from '../../../common/imports';
import { Mutation } from './mutation';
import { Subscription } from './subscription';
import { getQueueManager } from '../helpers';

function getRule(context, { queueId, ruleId }): Rule {
  const manager = getQueueManager(context, queueId);
  const rule = manager.getRule(ruleId);
  if (!rule) {
    // todo: throw on not found ?
    throw boom.notFound(`Cannot find rule for id#${ruleId}`);
  }
  return rule;
}

export const ruleResolver = {
  Query: {
    rule(_, args, context): Rule {
      return getRule(context, args);
    },
    async ruleAlert(_, args, context): Promise<RuleAlert> {
      const { queueId, ruleId, alertId } = args;
      const manager = getQueueManager(context, queueId);
      const rules = manager.ruleManager;
      const alert = await rules.getAlert(ruleId, alertId);
      if (!alert) {
        throw boom.notFound(
          `Cannot find alert#${alertId} for rule id#${ruleId}`,
        );
      }
      return alert;
    },
  },
  Rule: {
    alerts(parent, args, context): Promise<RuleAlert[]> {
      const { start = 0, end, sortOrder = 'ASC' } = args || {};
      const asc = sortOrder.toUpperCase() === 'ASC';
      const manager = getQueueManager(context, parent.queueId);
      const ruleManager = manager.ruleManager;
      return ruleManager.getRuleAlerts(parent, start, end, asc);
    },
    alertCount(parent, args, { supervisor }): Promise<number> {
      const manager = supervisor.getQueueManager(parent.queueId);
      const ruleManager = manager.ruleManager;
      return ruleManager.getRuleAlertCount(parent);
    },
  },
  Mutation,
  Subscription,
};
