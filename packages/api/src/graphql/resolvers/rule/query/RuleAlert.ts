import { schemaComposer } from 'graphql-compose';
import {
  ConditionChangeEnum,
  ErrorLevelEnum,
  PeakSignalDirectionEnum,
  RuleOperatorEnum,
  RuleTypeEnum,
  SeverityType,
} from '../../../scalars';
import { RuleType } from '@alpen/core';
import { AggregationTypeEnum } from '../../metric/scalars';

const BaseStateFields = {
  ruleType: {
    type: RuleTypeEnum.NonNull,
    description: 'The type of rule',
  },
  errorLevel: ErrorLevelEnum.NonNull,
  errorThreshold: {
    type: 'Float!',
    description: 'The error threshold of the rule',
  },
  warningThreshold: {
    type: 'Float',
    description: 'The warning threshold of the rule',
  },
  value: {
    type: 'Float',
    description: 'The value which triggered the alert',
  },
  comparator: {
    type: RuleOperatorEnum.NonNull,
    description: 'The rule operator',
  },
  unit: {
    type: 'String!',
  },
};

export const RuleEvaluationStateInterfaceTC = schemaComposer.createInterfaceTC({
  name: 'RuleEvaluationState',
  description: 'Describes the state value from a rule evaluation.',
  fields: BaseStateFields,
});

export const ThresholdRuleEvaluationStateTC = schemaComposer.createObjectTC({
  name: 'ThresholdRuleEvaluationState',
  description: 'The state resulting from evaluation off a rule condition',
  interfaces: [RuleEvaluationStateInterfaceTC],
  fields: {
    ...BaseStateFields,
  },
});

export const PeakRuleEvaluationStateTC = schemaComposer.createObjectTC({
  name: 'PeakRuleEvaluationState',
  description: 'The state resulting from evaluation a Peak rule condition',
  interfaces: [RuleEvaluationStateInterfaceTC],
  fields: {
    ...BaseStateFields,
    signal: {
      type: 'Int!', /// todo: Enum
    },
    direction: PeakSignalDirectionEnum.NonNull,
  },
});

export const ChangeRuleEvaluationStateTC = schemaComposer.createObjectTC({
  name: 'ChangeRuleEvaluationState',
  description: 'The state resulting from evaluation a Change rule condition',
  interfaces: [RuleEvaluationStateInterfaceTC],
  fields: {
    ...BaseStateFields,
    windowSize: {
      type: 'Duration!',
    },
    timeShift: {
      type: 'Duration!',
    },
    changeType: {
      type: ConditionChangeEnum.NonNull,
    },
    aggregation: {
      type: AggregationTypeEnum.NonNull,
    },
  },
});

// Resolvers
function makePredicate(ruleType: RuleType) {
  return (value: any) => value['ruleType'] === ruleType;
}

const thresholdEvaluationStatePredicate = makePredicate(RuleType.THRESHOLD);
const peakEvaluationStatePredicate = makePredicate(RuleType.PEAK);
const changeEvaluationStatePredicate = makePredicate(RuleType.CHANGE);

RuleEvaluationStateInterfaceTC.addTypeResolver(
  ChangeRuleEvaluationStateTC,
  changeEvaluationStatePredicate,
);

RuleEvaluationStateInterfaceTC.addTypeResolver(
  PeakRuleEvaluationStateTC,
  peakEvaluationStatePredicate,
);

RuleEvaluationStateInterfaceTC.addTypeResolver(
  ThresholdRuleEvaluationStateTC,
  thresholdEvaluationStatePredicate,
);

RuleEvaluationStateInterfaceTC.setTypeResolverFallback(
  ThresholdRuleEvaluationStateTC,
);

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
    title: 'String',
    message: 'String',
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
      type: RuleEvaluationStateInterfaceTC.NonNull,
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
