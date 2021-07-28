import baseSchema from '../schemas/baseSchema';
import Joi from 'joi';

export default baseSchema
  .append({
    token: Joi.string().description(
      'Slack authentication token bearing required scopes',
    ),
    webhook: Joi.string().uri().description('uri of incoming webhook'),
    channel: Joi.string().optional(),
  })
  .or('token', 'webhook')
  .label('slack');
