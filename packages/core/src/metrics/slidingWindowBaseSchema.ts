import Joi from 'joi';
import { DurationSchema } from '../validation';

export default Joi.object().keys({
  duration: DurationSchema,
});
