import {
  ChangeAggregation as GQLChangeAggregation,
  ConditionChangeType as GQLChangeType,
  PeakSignalDirection as GQLPeakSignalDirection,
  RuleConditionInput,
  RuleOperator as GQLRuleOperator,
  RuleType as GQLRuleType,
  Severity as GQLSeverity,
} from '../../../typings';
import {
  ChangeAggregationType,
  ChangeTypeEnum,
  PeakSignalDirection,
  RuleCondition,
  RuleOperator,
  RuleType,
  Severity,
} from '@src/types';
import boom from '@hapi/boom';

export function convertCondition(input: RuleConditionInput): RuleCondition {
  let condition: RuleCondition;

  if (
    !(input.thresholdCondition || input.peakCondition || input.changeCondition)
  ) {
    throw boom.badRequest(`No condition specified for type "${input.type}"`);
  }

  switch (input.type) {
    case GQLRuleType.Change:
      if (input.changeCondition) {
        const { operator, changeType, aggregationType, ...rest } =
          input.changeCondition;
        return {
          type: RuleType.CHANGE,
          changeType: translateChangeType(changeType),
          operator: translateOperator(operator),
          aggregationType: translateAggregation(aggregationType),
          windowSize: 0,
          ...rest,
        };
      }
      break;
    case GQLRuleType.Peak:
      if (input.changeCondition) {
        const { operator, direction, ...rest } = input.peakCondition;
        return {
          type: RuleType.PEAK,
          ...rest,
          operator: translateOperator(operator),
          direction: translateDirection(direction),
        };
      }
      break;
    case GQLRuleType.Threshold:
      const { operator, ...rest } = input.thresholdCondition;
      return {
        type: RuleType.THRESHOLD,
        ...rest,
        operator: translateOperator(operator),
      };
  }

  return condition;
}

export function translateAggregation(
  agg: GQLChangeAggregation,
): ChangeAggregationType {
  switch (agg) {
    case GQLChangeAggregation.Avg:
      return ChangeAggregationType.AVG;
    case GQLChangeAggregation.Max:
      return ChangeAggregationType.MAX;
    case GQLChangeAggregation.Min:
      return ChangeAggregationType.MIN;
    case GQLChangeAggregation.P90:
      return ChangeAggregationType.P90;
    case GQLChangeAggregation.P95:
      return ChangeAggregationType.P95;
    case GQLChangeAggregation.P99:
      return ChangeAggregationType.P99;
    case GQLChangeAggregation.Sum:
      return ChangeAggregationType.SUM;
  }
}

export function translateChangeType(change: GQLChangeType): ChangeTypeEnum {
  switch (change) {
    case GQLChangeType.Pct:
      return ChangeTypeEnum.PCT;
    case GQLChangeType.Change:
      return ChangeTypeEnum.CHANGE;
  }
}

export function translateOperator(op: GQLRuleOperator): RuleOperator {
  switch (op) {
    case GQLRuleOperator.Eq:
      return RuleOperator.EQ;
    case GQLRuleOperator.Gt:
      return RuleOperator.GT;
    case GQLRuleOperator.Gte:
      return RuleOperator.GTE;
    case GQLRuleOperator.Lt:
      return RuleOperator.LT;
    case GQLRuleOperator.Lte:
      return RuleOperator.LTE;
    case GQLRuleOperator.Ne:
      return RuleOperator.NE;
  }
}

export function translateDirection(
  dir: GQLPeakSignalDirection,
): PeakSignalDirection {
  switch (dir) {
    case GQLPeakSignalDirection.Above:
      return PeakSignalDirection.ABOVE;
    case GQLPeakSignalDirection.Below:
      return PeakSignalDirection.BELOW;
    case GQLPeakSignalDirection.Both:
      return PeakSignalDirection.BOTH;
  }
}

export function translateSeverity(severity: GQLSeverity): Severity {
  switch (severity) {
    case 'CRITICAL':
      return Severity.CRITICAL;
    case 'ERROR':
      return Severity.ERROR;
    case 'INFO':
      return Severity.INFO;
    case 'WARNING':
      return Severity.WARNING;
  }
}
