import Joi from 'joi';
import { DurationSchema } from '../validation/schemas';

export default Joi.object().keys({
  duration: DurationSchema,
});
