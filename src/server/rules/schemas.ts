import Joi from 'joi';
import { DurationSchema } from '../validation/schemas';
import {
  ChangeAggregationType,
  PeakSignalDirection,
  RuleAlertOptions,
  RuleCondition,
  RuleOperator,
  RuleType,
  Severity,
} from '../../types';

const ruleAlertOptionsSchema = Joi.object().keys({
  warmupWindow: DurationSchema.optional(),
  triggerWindow: DurationSchema.optional().default(0),
  recoveryWindow: DurationSchema.optional().default(0),
  maxAlertsPerEvent: Joi.number().integer().positive().optional().default(0),
  alertOnReset: Joi.boolean().optional().default(true),
  renotifyInterval: DurationSchema.optional(),
  minViolations: Joi.number().integer().positive().default(1),
});

export const notificationThresholdSchema = Joi.object().keys({
  warningThreshold: Joi.number().optional(),
  errorThreshold: Joi.number().required(),
});

export const thresholdConditionSchema = notificationThresholdSchema.keys({
  type: Joi.string().required().valid(RuleType.THRESHOLD),
  operator: Joi.string().valid(
    RuleOperator.eq,
    RuleOperator.ne,
    RuleOperator.gt,
    RuleOperator.gte,
    RuleOperator.lt,
    RuleOperator.lte,
  ),
});

export const peakConditionSchema = thresholdConditionSchema.keys({
  type: Joi.string().valid(RuleType.PEAK),
  timeWindow: DurationSchema,
  deviations: Joi.number()
    .description('std deviations')
    .positive()
    .default(3.5),
  influence: Joi.number().positive().default(0.5),
  lag: DurationSchema.default(0),
  direction: Joi.string()
    .valid(
      PeakSignalDirection.BOTH,
      PeakSignalDirection.ABOVE,
      PeakSignalDirection.BELOW,
    )
    .default(PeakSignalDirection.BOTH),
  measurement: Joi.string().optional().valid('count', 'percent'),
});

export const changeConditionSchema = thresholdConditionSchema.keys({
  type: Joi.string().required().valid(RuleType.CHANGE),
  changeType: Joi.string().valid('PCT', 'CHANGE').default('CHANGE'),
  timeWindow: DurationSchema,
  timeShift: DurationSchema,
  aggregationType: Joi.string()
    .valid(
      ChangeAggregationType.Avg,
      ChangeAggregationType.Min,
      ChangeAggregationType.Max,
      ChangeAggregationType.P90,
      ChangeAggregationType.P95,
      ChangeAggregationType.P99,
      ChangeAggregationType.Sum,
    )
    .default(ChangeAggregationType.Avg),
});

export const ruleMetricSchema = Joi.object().keys({
  type: Joi.string().required(),
  options: Joi.object().optional().default({}),
  aggregator: Joi.object().optional(),
});

export const ruleConditionSchema = Joi.alternatives().try(
  thresholdConditionSchema,
  peakConditionSchema,
  changeConditionSchema,
);

export const defaultRuleAlertOptions: RuleAlertOptions = {
  renotifyInterval: 0,
  warmupWindow: 0,
  alertOnReset: true,
  triggerWindow: 0,
  maxAlertsPerEvent: 1,
  recoveryWindow: 0,
};

export const ruleConfigSchema = Joi.object().keys({
  id: Joi.string()
    .regex(/^[a-zA-Z0-9_\-!@#$]{3,25}$/)
    .optional(),
  name: Joi.string().required(),
  description: Joi.string().optional().allow(null, ''),
  message: Joi.string().optional().allow(null, ''),
  createdAt: Joi.date().optional(),
  updatedAt: Joi.date().optional(),
  metric: ruleMetricSchema,
  condition: ruleConditionSchema.required().default(Object.create(null)),
  active: Joi.boolean().default(true).optional(),
  persist: Joi.boolean().default(true).optional(),
  payload: Joi.object().default(Object.create(null)),
  options: ruleAlertOptionsSchema.optional().default(defaultRuleAlertOptions),
  severity: Joi.string()
    .valid(...Object.values(Severity))
    .default(Severity.WARNING),
  channels: Joi.array().items(Joi.string()).single().default([]),
  lastAlertAt: Joi.date().optional(),
});

export function parseRuleCondition(
  options: Record<string, any>,
): RuleCondition {
  const { error, value } = ruleConditionSchema.validate(options);
  if (error) {
    throw error;
  }
  return value as RuleCondition;
}
