import { parseDuration } from '@alpen/shared';
import boom from '@hapi/boom';
import { EZContext } from 'graphql-ez';
import { FieldConfig, RuleTC, RuleUpdateInputTC } from '../../index';
import { RuleUpdateInput } from '../../../typings';
import { convertCondition, translateSeverity } from './utils';

export const updateRule: FieldConfig = {
  type: RuleTC.NonNull,
  description: 'Update a rule',
  args: {
    input: RuleUpdateInputTC.NonNull,
  },
  async resolve(
    _,
    { input }: { input: RuleUpdateInput },
    { accessors }: EZContext,
  ): Promise<any> {
    const { queueId, id } = input;
    const manager = accessors.getQueueManager(queueId, true);
    const rule = await manager.getRule(id);
    if (!rule) {
      throw boom.notFound(
        `No rule with id "${id}" found in queue "${manager.name}"`,
      );
    }

    if (input.metricId) {
      const metric = await manager.findMetric(input.metricId);
      if (!metric) {
        throw boom.notFound(
          `Invalid metric ${input.metricId} is required for a rule`,
        );
      }
      rule.metricId = input.metricId;
    }
    if (input.name) {
      const names = await manager.ruleManager.storage.getRuleNames();
      console.log(names);
      // todo: make sure we dont duplicate names
    }
    if (input.message) {
      rule.message = input.message;
    }
    if (input.description !== undefined) {
      rule.description = input.description;
    }
    if (input.isActive !== undefined) {
      rule.isActive = !!input.isActive;
    }
    if (input.payload !== undefined) {
      rule.payload = input.payload;
    }
    if (input.condition !== undefined) {
      rule.condition = convertCondition(input.condition);
    }
    if (input.severity !== undefined) {
      rule.severity = translateSeverity(input.severity);
    }
    if (input.options !== undefined) {
      const { triggerDelay, notifyInterval, recoveryWindow, ...options } = input.options;
      rule.alertOptions = {
        ...options,
        ...(triggerDelay && { triggerDelay: parseDuration(triggerDelay) }),
        ...(notifyInterval && { notifyInterval: parseDuration(notifyInterval) }),
        ...(recoveryWindow && { recoveryWindow: parseDuration(recoveryWindow) }),
      };
    }
    // channels
    return manager.updateRule(rule);
  },
};
