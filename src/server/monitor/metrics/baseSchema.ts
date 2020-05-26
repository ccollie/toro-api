import Joi from '@hapi/joi';
import { durationSchema } from '../validation/joi';

const schema = Joi.object().keys({
  duration: durationSchema,
  period: Joi.number().integer().positive().default(750), // todo: get default from config
});

export default schema;
