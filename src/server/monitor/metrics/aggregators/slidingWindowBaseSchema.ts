import Joi from '@hapi/joi';
import { durationSchema } from '../../validation/joi';

const schema = Joi.object().keys({
  duration: durationSchema,
  period: Joi.number().integer().positive().optional(),
});

export default schema;
