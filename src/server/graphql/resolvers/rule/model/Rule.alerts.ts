import { OrderEnumType } from '../../scalars';
import { getQueueRuleManager } from '../../../helpers';
import { FieldConfig } from '../../utils';
import { schemaComposer } from 'graphql-compose';
import { RuleAlert } from '@src/types';
import { RuleAlertTC } from './RuleAlert';
import { Rule } from '@server/rules';
import { RuleAlertsInput, SortOrderEnum } from '@server/graphql/typings';

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
  ): Promise<RuleAlert[]> {
    const { start, end, sortOrder } = {
      ...(input ?? {}),
      ...DefaultInput,
    } as RuleAlertsInput;
    const asc = sortOrder === SortOrderEnum.Asc;
    const manager = getQueueRuleManager(parent.queueId);
    return manager.getRuleAlertsByIndex(parent, start, end, asc);
  },
};
