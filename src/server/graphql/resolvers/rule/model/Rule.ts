import { schemaComposer } from 'graphql-compose';
import { RuleStateEnum, SeverityType } from '../../scalars';
import {
  RuleConditionInputTC,
  RuleConditionInterfaceTC,
} from './RuleCondition';
import {
  RuleAlertOptionsInputTC,
  RuleAlertOptionsTC,
} from './RuleAlertOptions';
import { ruleAlertsFC } from './Rule.alerts';
import { ruleAlertCountFC } from './Rule.alert-count';
import { ruleMetric } from './Rule.metric';
import { ruleChannels } from './Rule.channels';
import { ruleStatus } from './Rule.status';

const BaseFields = {
  queueId: {
    type: 'ID!',
    description: 'The id of the queue to which the rule belongs',
  },
  name: {
    type: 'String!',
    description: 'The names of the rule',
  },
  description: {
    type: 'String',
    description: 'A helpful description of the rule',
  },
  severity: {
    type: SeverityType,
  },
  isActive: {
    type: 'Boolean!',
    description: 'Is this rule active or not',
  },
  payload: {
    type: 'JSONObject',
    description: 'Optional data passed on to alerts',
  },
  message: {
    type: 'String',
    description:
      'Optional text for message when an alert is raised. Markdown and handlebars supported',
  },
};

export const RuleTC = schemaComposer.createObjectTC({
  name: 'Rule',
  fields: {
    id: {
      type: 'ID!',
      description: 'The rule id',
    },
    ...BaseFields,
    createdAt: {
      type: 'Date!',
      description: 'The rule creation timestamp',
    },
    updatedAt: {
      type: 'Date!',
      description: 'The timestamp of last update',
    },
    lastTriggeredAt: {
      type: 'Date',
      description: 'The last time the rule was triggered',
    },
    state: {
      type: RuleStateEnum,
      description: 'The current rule states',
    },
    status: ruleStatus,
    metric: ruleMetric,
    condition: {
      type: RuleConditionInterfaceTC.NonNull,
      makeRequired: true,
    },
    channels: ruleChannels,
    options: {
      type: RuleAlertOptionsTC,
      description: 'Options controlling the generation of events',
    },
    alerts: ruleAlertsFC,
    alertCount: ruleAlertCountFC,
    totalFailures: {
      type: 'Int!',
      description: 'The total number of failures',
    },
  },
});

export const RuleAddInputTC = schemaComposer.createInputTC({
  name: 'RuleAddInput',
  description: 'Information required to add or edit a Rule',
  fields: {
    ...BaseFields,
    metricId: {
      type: 'String!',
      description: 'The id of the metric being monitored',
      makeRequired: true,
    },
    condition: {
      type: RuleConditionInputTC.NonNull,
      description: 'The rule condition',
    },
    channels: {
      type: '[String!]',
      makeRequired: true,
      description: 'Notification channel ids',
    },
    options: {
      type: RuleAlertOptionsInputTC,
      description: 'Options controlling the generation of events',
    },
  },
});

const OptionalFields = ['metricId', 'isActive', 'name', 'severity'];

export const RuleUpdateInputTC = RuleAddInputTC.clone('RuleUpdateInput')
  .setDescription('Information needed to update a rule')
  .addFields({
    id: {
      type: 'ID!',
      description: 'The id of the the rule to update',
    },
  })
  .makeFieldNullable(OptionalFields);
