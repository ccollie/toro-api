import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../utils';
import { Queue } from 'bullmq';
import { Rule } from '@alpen/core';
import { RuleTC } from '../../rule/model/Rule';

export const queueRules: FieldConfig = {
  args: {},
  type: RuleTC.NonNull.List.NonNull,
  resolve(queue: Queue, _, { accessors }: EZContext): Rule[] {
    const manager = accessors.getQueueManager(queue);
    return manager.rules;
  },
};
