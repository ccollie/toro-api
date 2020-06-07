import Joi from '@hapi/joi';
import { durationSchema } from '../validation/joi';

export default Joi.object().keys({
  duration: durationSchema,
  period: Joi.number().integer().positive().optional(), // todo: get default from config
});
