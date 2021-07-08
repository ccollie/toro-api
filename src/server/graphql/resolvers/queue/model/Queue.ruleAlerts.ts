import {
  GraphQLDate,
  ObjectTypeComposerFieldConfigDefinition,
  schemaComposer,
} from 'graphql-compose';
import { Queue } from 'bullmq';
import { OrderEnumType, SortOrderEnum } from '../../../scalars';
import { getQueueManager } from '../../../helpers';

const QueueRuleAlertsInput = schemaComposer.createInputTC({
  name: 'QueueRuleAlertsInput',
  description: 'Options for retrieving queue rule alerts',
  fields: {
    startDate: {
      type: GraphQLDate,
      description: 'Consider alerts starting on or after this date',
    },
    endDate: {
      type: GraphQLDate,
      description: 'Consider alerts ending on or before this date',
    },
    sortOrder: {
      type: OrderEnumType,
      defaultValue: SortOrderEnum.ASC,
      description:
        'The sort order of the results. Alerts are sorted by creation date.',
    },
    limit: {
      type: 'Int!',
      default: 100,
      description: 'The maximum number of alerts to return',
    },
  },
});

export const ruleAlerts: ObjectTypeComposerFieldConfigDefinition<any, any> = {
  type: '[RuleAlert!]!',
  description: 'Gets rule alerts associated with the queue',
  args: { input: QueueRuleAlertsInput },
  resolve: async (queue: Queue, { input }) => {
    const {
      startDate = '-',
      endDate = '+',
      sortOrder = SortOrderEnum.ASC,
      limit = 100,
    } = input || {};
    const asc = sortOrder.toLowerCase() === 'asc';
    const manager = getQueueManager(queue);
    return manager.getAlerts(startDate, endDate, asc, limit);
  },
};
