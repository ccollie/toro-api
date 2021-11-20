import * as Joi from 'joi';

export const ConnectionOptionsSchema = Joi.object().keys({
  port: Joi.number().positive().greater(1000).optional().default(6379),
  host: Joi.string().default('localhost'),
  family: Joi.number().positive().default(4),
  connectTimeout: Joi.number().positive().default(10000),
  db: Joi.number().min(0).default(0),
  connectionName: Joi.string().optional().default(null),
  password: Joi.string().optional(),
});

export const ConnectionSchema = Joi.alternatives().try(
  Joi.string().uri(),
  ConnectionOptionsSchema,
);
