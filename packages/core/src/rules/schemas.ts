import * as Joi from 'joi';
import {
  ChangeAggregationType,
  PeakSignalDirection,
  RuleAlertOptions,
  RuleCondition,
  RuleOperator,
  RuleState,
  RuleType,
  Severity
} from '../types';
import { DurationSchema } from '../validation';


export const ruleAlertOptionsSchema = Joi.object().keys({
  warmupWindow: DurationSchema.optional(),
  recoveryWindow: DurationSchema.optional().default(0),
  triggerDelay: DurationSchema.optional().default(0),
  maxAlertsPerEvent: Joi.number().integer().positive().optional().default(1),
  alertOnReset: Joi.boolean().optional().default(true),
  notifyInterval: DurationSchema.optional(),
  failureThreshold: Joi.number().integer().positive().optional().default(1),
  successThreshold: Joi.number().integer().optional().default(1),
});

export const notificationThresholdSchema = Joi.object().keys({
  warningThreshold: Joi.number().optional(),
  errorThreshold: Joi.number().required(),
});

export const thresholdConditionSchema = notificationThresholdSchema.keys({
  type: Joi.string().required().valid(RuleType.THRESHOLD),
  operator: Joi.string().valid(
    RuleOperator.EQ,
    RuleOperator.NE,
    RuleOperator.GT,
    RuleOperator.GTE,
    RuleOperator.LT,
    RuleOperator.LTE,
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
  changeType: Joi.string().optional().valid('count', 'percent'),
});

export const changeConditionSchema = thresholdConditionSchema.keys({
  type: Joi.string().required().valid(RuleType.CHANGE),
  changeType: Joi.string().valid('PCT', 'CHANGE').default('CHANGE'),
  windowSize: DurationSchema,
  timeShift: DurationSchema,
  aggregationType: Joi.string()
    .valid(
      ChangeAggregationType.AVG,
      ChangeAggregationType.MIN,
      ChangeAggregationType.MAX,
      ChangeAggregationType.P90,
      ChangeAggregationType.P95,
      ChangeAggregationType.P99,
      ChangeAggregationType.SUM,
    )
    .default(ChangeAggregationType.AVG),
});

export const serializedAggregatorSchema = Joi.object().keys({
  type: Joi.string().required(),
  options: Joi.object().optional().default({}),
});

export const ruleMetricSchema = Joi.object().keys({
  id: Joi.string(),
  type: Joi.string().required(),
  options: Joi.object().optional().default({}),
  aggregator: serializedAggregatorSchema,
});

export const ruleConditionSchema = Joi.alternatives().try(
  thresholdConditionSchema,
  peakConditionSchema,
  changeConditionSchema,
);

export const defaultRuleAlertOptions: RuleAlertOptions = {
  notifyInterval: 0,
  alertOnReset: true,
  maxAlertsPerEvent: 1,
  triggerDelay: 0,
  recoveryWindow: 0,
  failureThreshold: 1,
  successThreshold: 0,
};

export const ruleConfigSchema = Joi.object().keys({
  id: Joi.string()
    .regex(/^[a-zA-Z0-9_\-!@#$]{3,25}$/)
    .optional(),
  name: Joi.string().required(),
  state: Joi.string()
    .optional()
    .valid(...Object.values(RuleState))
    .valid(
      RuleState.WARNING,
      RuleState.MUTED,
      RuleState.NORMAL,
      RuleState.ERROR,
    )
    .default(RuleState.NORMAL),
  queueId: Joi.string().optional().allow(null, ''),
  description: Joi.string().optional().allow(null, ''),
  message: Joi.string().optional().allow(null, ''),
  createdAt: Joi.date().optional(),
  updatedAt: Joi.date().optional(),
  lastTriggeredAt: Joi.date().optional(),
  metricId: Joi.string().required(),
  condition: ruleConditionSchema.required().default(Object.create(null)),
  isActive: Joi.boolean().default(true).optional(),
  persist: Joi.boolean().default(true).optional(),
  payload: Joi.object().default(Object.create(null)),
  options: ruleAlertOptionsSchema.optional().default(defaultRuleAlertOptions),
  severity: Joi.string()
    .valid(...Object.values(Severity))
    .default(Severity.WARNING),
  channels: Joi.array().items(Joi.string()).single().default([]),
  lastAlertAt: Joi.date().optional(),
  // failures: Joi.number().integer().optional().default(0),
  totalFailures: Joi.number().integer().optional().default(0),
  alertCount: Joi.number().integer().optional().default(0),
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
