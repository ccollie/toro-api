import { FieldConfig, RuleTC, RuleUpdateInputTC } from '../../index';
import { getQueueManager } from '../../../helpers';
import { RuleConfigOptions } from '../../../../../types';
import boom from '@hapi/boom';

export const ruleUpdate: FieldConfig = {
  type: RuleTC.NonNull,
  description: 'Update a rule',
  args: {
    input: RuleUpdateInputTC.NonNull,
  },
  async resolve(_, args): Promise<any> {
    const { queueId, id, ...rest } = args;
    const manager = getQueueManager(queueId);
    const rule = await manager.getRule(id);
    if (!rule) {
      throw boom.notFound(
        `No rule with id "${id}" found in queue "${manager.name}"`,
      );
    }
    const opts = rest as RuleConfigOptions;
    if (opts.metricId) {
      const metric = await manager.findMetric(opts.metricId);
      if (!metric) {
        throw boom.notFound(
          `Invalid metric ${opts.metricId} is required for a rule`,
        );
      }
      rule.metricId = opts.metricId;
    }
    if (opts.name) {
      const names = await manager.ruleManager.storage.getRuleNames();
      console.log(names);
      // todo: make sure we dont duplicate names
    }
    if (opts.message) {
      rule.message = opts.message;
    }
    if (opts.description !== undefined) {
      rule.description = opts.description;
    }
    if (opts.isActive !== undefined) {
      rule.isActive = !!opts.isActive;
    }
    if (opts.payload !== undefined) {
      rule.payload = opts.payload;
    }
    if (opts.condition !== undefined) {
      rule.condition = opts.condition;
    }
    if (opts.severity !== undefined) {
      rule.severity = opts.severity;
    }
    if (opts.options !== undefined) {
      rule.alertOptions = opts.options;
    }
    // channels
    return manager.updateRule(rule);
  },
};
