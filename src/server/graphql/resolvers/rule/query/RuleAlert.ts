import { schemaComposer } from 'graphql-compose';
import { ErrorLevelEnum, SeverityType } from '../../scalars';

export const RuleAlertTC = schemaComposer.createObjectTC({
  name: 'RuleAlert',
  description:
    'An event recording the occurrence of an rule violation or reset',
  fields: {
    id: 'ID!',
    event: {
      type: 'String!',
      description: 'The event that raised this alert',
    },
    start: {
      type: 'DateTime!',
      description: 'Timestamp of when this alert was raised',
    },
    end: {
      type: 'DateTime',
      description: 'Timestamp of when this alert was reset',
    },
    threshold: {
      type: 'Float!',
      description:
        'The value of the alert threshold set in the rule’s alert conditions.',
    },
    value: {
      type: 'Float!',
      description: 'The metric value that crossed the threshold.',
    },
    resetValue: {
      type: 'Float',
      description: 'The metric value that reset the threshold.',
    },
    state: {
      type: 'JSONObject',
      description: 'State that triggered alert',
    },
    violations: {
      type: 'Int!',
      description: 'The number of violations before this alert was generated',
    },
    payload: {
      type: 'JSONObject',
      description: 'Optional rule specific data. Corresponds to Rule.payload',
    },
    errorLevel: {
      type: ErrorLevelEnum,
      makeRequired: true,
      description: 'Error level',
    },
    severity: {
      type: SeverityType,
      description: 'A categorization of the severity of the rule type',
    },
  },
});
