import {
  AggregationType,
  ChangeTypeEnum,
  ErrorStatus,
  MetricGranularity,
  PeakSignalDirection,
  QueueFilterStatus,
  RuleOperator,
  RuleState,
  RuleType,
  Severity,
} from '@alpen/core';
import { createEnumFromTS } from './types';

export const ConditionChangeEnum = createEnumFromTS(
  ChangeTypeEnum,
  'ConditionChangeType',
);

export const ErrorLevelEnum = createEnumFromTS(ErrorStatus, 'ErrorLevel');

export const PeakSignalDirectionEnum = createEnumFromTS(
  PeakSignalDirection,
  'PeakSignalDirection',
);
export const QueueFilterStatusEnum = createEnumFromTS(
  QueueFilterStatus,
  'QueueFilterStatus',
);

export const RuleOperatorEnum = createEnumFromTS(RuleOperator, 'RuleOperator');
export const RuleStateEnum = createEnumFromTS(RuleState, 'RuleState');
export const RuleTypeEnum = createEnumFromTS(RuleType, 'RuleType');
export const SeverityType = createEnumFromTS(Severity, 'Severity');
export const MetricGranularityEnum = createEnumFromTS(
  MetricGranularity,
  'MetricGranularity',
);
export const AggregationTypeEnum = createEnumFromTS(
  AggregationType,
  'AggregationType',
);
