import { SortOrderEnum, OrderEnumType } from '../../scalars';
import { getQueueManager } from '../../../helpers';
import { FieldConfig } from '../../utils';
import { schemaComposer } from 'graphql-compose';
import { RuleAlert } from '@src/types';
import { RuleAlertTC } from './RuleAlert';
import { Rule } from '@server/rules';

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
          defaultValue: SortOrderEnum.ASC,
        },
      },
    }).NonNull,
  },
  async resolve(parent: Rule, { input }): Promise<RuleAlert[]> {
    const { start = 0, end, sortOrder = 'ASC' } = input;
    const asc = sortOrder.toUpperCase() === 'ASC';
    const manager = getQueueManager(parent.queueId);
    const ruleManager = manager.ruleManager;
    return ruleManager.getRuleAlerts(parent, start, end, asc);
  },
};
