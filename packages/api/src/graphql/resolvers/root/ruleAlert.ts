import { FieldConfig, RuleAlertTC } from '../index';
import { getQueueManager } from '../../helpers';
import boom from '@hapi/boom';
import { RuleAlert } from '@alpen/core';

export const ruleAlert: FieldConfig = {
  type: RuleAlertTC,
  args: {
    queueId: 'ID!',
    ruleId: 'ID!',
    alertId: 'ID!',
  },
  async ruleAlert(_: unknown, args): Promise<RuleAlert> {
    const { queueId, ruleId, alertId } = args;
    const manager = getQueueManager(queueId);
    const rules = manager.ruleManager;
    const alert = await rules.getAlert(ruleId, alertId);
    if (!alert) {
      throw boom.notFound(`Cannot find alert#${alertId} for rule id#${ruleId}`);
    }
    return alert;
  },
};
