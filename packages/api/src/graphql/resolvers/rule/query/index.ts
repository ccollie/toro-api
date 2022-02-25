import { schemaComposer } from 'graphql-compose';
import { RuleStateEnum, SeverityType } from '../../../scalars';
import {
  RuleConditionInputTC,
  RuleConditionInterfaceTC,
} from './RuleCondition';
import {
  RuleAlertOptionsInputTC,
  RuleAlertOptionsTC,
} from './RuleAlertOptions';
import { ruleAlertsFC } from './alerts';
import { metric } from './metric';
import { channels } from './channels';
import { status } from './status';

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
    status: status,
    metric: metric,
    condition: {
      type: RuleConditionInterfaceTC.NonNull,
      makeRequired: true,
    },
    channels: channels,
    options: {
      type: RuleAlertOptionsTC,
      description: 'Options controlling the generation of events',
    },
    alerts: ruleAlertsFC,
    alertCount: {
      type: 'Int!',
      description: 'The current count of alerts available for this rule',
    },
    totalFailures: {
      type: 'Int!',
      description: 'The total number of failures',
    },
  },
});

export const CreateRuleInputTC = schemaComposer.createInputTC({
  name: 'CreateRuleInput',
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

export const RuleUpdateInputTC = CreateRuleInputTC.clone('RuleUpdateInput')
  .setDescription('Information needed to update a rule')
  .addFields({
    id: {
      type: 'ID!',
      description: 'The id of the the rule to update',
    },
  })
  .makeFieldNullable(OptionalFields);
