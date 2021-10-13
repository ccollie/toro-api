import { EZContext } from 'graphql-ez';
import { OrderEnumType } from '../../../scalars';
import { FieldConfig } from '../../utils';
import { schemaComposer } from 'graphql-compose';
import { Rule, RuleAlert } from '@alpen/core/rules';
import { RuleAlertTC } from './RuleAlert';
import { RuleAlertsInput, SortOrderEnum } from '../../../typings';

const DefaultInput: RuleAlertsInput = {
  start: 0,
  end: 10,
  sortOrder: SortOrderEnum.Desc,
};

export const ruleAlertsFC: FieldConfig = {
  type: RuleAlertTC.List.NonNull,
  args: {
    input: schemaComposer.createInputTC({
      name: 'RuleAlertsInput',
      fields: {
        start: {
          type: 'Int',
          defaultValue: 0,
        },
        end: {
          type: 'Int',
          defaultValue: 10,
        },
        sortOrder: {
          type: OrderEnumType,
          defaultValue: SortOrderEnum.Desc,
        },
      },
    }),
  },
  async resolve(
    parent: Rule,
    { input }: { input: RuleAlertsInput },
    { accessors }: EZContext,
  ): Promise<RuleAlert[]> {
    const { start, end, sortOrder } = {
      ...(input ?? {}),
      ...DefaultInput,
    } as RuleAlertsInput;
    const asc = sortOrder === SortOrderEnum.Asc;
    const manager = accessors.getQueueRuleManager(parent.queueId);
    return manager.getRuleAlertsByIndex(parent, start, end, asc);
  },
};
