import baseSchema from '../schemas/baseSchema';
import * as Joi from 'joi';

// validator for MailChannelConfig
export default baseSchema
  .append({
    recipients: Joi.array().items(Joi.string().email()).single().required(),
  })
  .label('email channel')
  .description('email channel config');
