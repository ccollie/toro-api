import { schemaComposer } from 'graphql-compose';
import { RuleStateType, SeverityType } from '../../scalars';
import { RuleConditionTC } from './RuleCondition';
import {
  RuleAlertOptionsInputTC,
  RuleAlertOptionsTC,
} from './RuleAlertOptions';
import { ruleAlertsFC } from './Rule.alerts';
import { ruleAlertCountFC } from './Rule.alert-count';

const SerializedAggregatorTC = schemaComposer.createObjectTC({
  name: 'SerializedAggregator',
  fields: {
    type: 'String!',
    options: 'JSONObject',
  },
});

export const RuleMetricTC = schemaComposer.createObjectTC({
  name: 'RuleMetric',
  fields: {
    id: 'String!',
    type: 'String!',
    options: 'JSONObject',
    aggregator: {
      type: SerializedAggregatorTC.NonNull,
    },
  },
});

export const RuleMetricInputTC = RuleMetricTC.getITC().setTypeName(
  'RuleMetricInput',
);

export const RuleTC = schemaComposer.createObjectTC({
  name: 'Rule',
  fields: {
    id: {
      type: 'ID!',
      description: 'The rule id',
    },
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
      description: 'The last time the rule was triggeered',
    },
    state: {
      type: RuleStateType,
      description: 'The current rule states',
    },
    severity: {
      type: SeverityType,
    },
    isActive: {
      type: 'Boolean!',
      description: 'Is this rule active or not',
    },
    metric: {
      type: RuleMetricTC.NonNull,
    },
    condition: {
      type: RuleConditionTC.NonNull,
      makeRequired: true,
    },
    message: {
      type: 'String',
      description:
        'Optional text for message when an alert is raised. Markdown and handlebars supported',
    },
    channels: {
      type: '[String!]!',
      description: 'channels for alert notifications.',
    },
    payload: {
      type: 'JSONObject',
      description: 'Optional data passed on to alerts',
    },
    options: {
      type: RuleAlertOptionsTC,
      description: 'Options controlling the generation of events',
    },
    alerts: ruleAlertsFC,
    alertCount: ruleAlertCountFC,
  },
});

export const RuleAddInputTC = RuleTC.clone('temp')
  .removeField([
    'condition',
    'options',
    'createdAt',
    'updatedAt',
    'id',
    'metric',
    'state',
    'alerts',
  ])
  .getITC()
  .setTypeName('RuleAddInput')
  .addFields({
    queueId: 'ID!',
    metric: {
      type: RuleMetricInputTC,
      makeRequired: true,
    },
    condition: {
      type: 'JSONObject',
      makeRequired: true,
      description: 'The rule condition',
    },
    options: {
      type: RuleAlertOptionsInputTC,
      description: 'Options controlling the generation of events',
    },
  });
