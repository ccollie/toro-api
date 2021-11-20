import * as joi from 'joi';
import { DurationSchema } from '../validation';

export default joi.object().keys({
  duration: DurationSchema,
});
