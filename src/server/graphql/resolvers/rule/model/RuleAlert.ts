import { schemaComposer } from 'graphql-compose';
import { ErrorLevelEnum, SeverityType } from '../../scalars';

export const RuleAlertTC = schemaComposer.createObjectTC({
  name: 'RuleAlert',
  description:
    'An event recording the occurrence of an rule violation or reset',
  fields: {
    id: 'ID!',
    ruleId: {
      type: 'String!',
      description: 'The id of the rule that raised this alert',
    },
    status: 'String!', // todo: enum open|close
    raisedAt: {
      type: 'DateTime!',
      description: 'Timestamp of when this alert was raised',
    },
    resetAt: {
      type: 'DateTime',
      description: 'Timestamp of when this alert was reset',
    },
    value: {
      type: 'Float!',
      description: 'The metric value that crossed the threshold.',
    },
    state: {
      type: 'JSONObject',
      description: 'State that triggered alert',
    },
    failures: {
      type: 'Int!',
      description: 'The number of failures before this alert was generated',
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
    isRead: {
      type: 'Boolean!',
      description: 'Has the alert been read or not',
    },
  },
});
