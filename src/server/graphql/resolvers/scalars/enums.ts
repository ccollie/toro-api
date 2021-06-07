import {
  ChangeAggregationType,
  ChangeTypeEnum,
  ErrorLevel,
  PeakSignalDirection,
  RuleOperator,
  RuleState,
  RuleType,
  Severity,
  StatsGranularity,
} from '@src/types';
import { QueueFilterStatus } from '@server/hosts';
import { createEnumFromTS } from '../../helpers';

export const ChangeAggregationEnum = createEnumFromTS(
  ChangeAggregationType,
  'ChangeAggregation',
);

export const ConditionChangeEnum = createEnumFromTS(
  ChangeTypeEnum,
  'ConditionChangeType',
);

export const ErrorLevelEnum = createEnumFromTS(ErrorLevel, 'ErrorLevel');

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
export const StatsGranularityEnum = createEnumFromTS(
  StatsGranularity,
  'StatsGranularity',
);
