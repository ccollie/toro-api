import Joi from '@hapi/joi';
import { durationSchema, slidingWindowSchema } from '../validation/joi';
import { RuleAlertOptions } from 'rules';

const volumeThresholdSchema = Joi.object().keys({
  volume: Joi.number().positive(),
  window: slidingWindowSchema.optional(),
});

const ruleAlertOptionsSchema = Joi.object().keys({
  volumeThreshold: volumeThresholdSchema.optional(),
  warmup: durationSchema.optional(),
  delay: durationSchema.default(0),
  repeatsPerTrigger: Joi.number().integer().positive().default(0),
  alertOnReset: Joi.boolean().default(true),
});

export const defaultRuleAlertOptions: RuleAlertOptions = {
  warmup: 0,
  alertOnReset: true,
  delay: 0,
  repeatsPerTrigger: 1,
};

export const ruleConfigSchema = Joi.object().keys({
  id: Joi.string()
    .regex(/^[a-zA-Z0-9_\-!@#$]{3,25}$/)
    .optional(),
  name: Joi.string().required(),
  description: Joi.string().optional(),
  createdAt: Joi.date().optional(),
  updatedAt: Joi.date().optional(),
  condition: Joi.object().required().default(Object.create(null)),
  notifiers: Joi.array().items(Joi.string()).single().default([]),
  active: Joi.boolean().default(true).optional(),
  persist: Joi.boolean().default(true).optional(),
  payload: Joi.object().default(Object.create(null)),
  window: slidingWindowSchema.optional(),
  options: ruleAlertOptionsSchema.optional().default(defaultRuleAlertOptions),
});
