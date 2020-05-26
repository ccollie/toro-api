'use strict';
import { Rule } from '../../../common/imports';
import { Queue } from 'bullmq';

export const ruleResolver = {
  Query: {
    rule(_, { queueId, ruleId }, { supervisor }): Rule {
      const manager = supervisor.getQueueManager(queueId);
      if (!manager) {
        // todo: throw on not found ?
        throw new Error(`Cannot find queue for id#${queueId}`);
      }
      return manager.getRule(ruleId);
    },
  },
  Rule: {
    alerts(parent, args, { supervisor }): any[] {
      const manager = supervisor.getQueueManager(parent.queueId);
      const ruleManager = manager.ruleManager;
      return ruleManager.getRuleAlerts(parent);
    },
    alertCount(parent, args, { supervisor }): Promise<number> {
      const manager = supervisor.getQueueManager(parent.queueId);
      const ruleManager = manager.ruleManager;
      return ruleManager.getRuleAlertCount(parent);
    },
  },
};
