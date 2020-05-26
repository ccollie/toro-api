import baseSchema from '../schemas/baseSchema';
import Joi from '@hapi/joi';

export default baseSchema
  .append({
    token: Joi.string().description(
      'Slack authentication token bearing required scopes',
    ),
    webhook: Joi.string().uri().description('uri of incoming webhook'),
    channel: Joi.string().required(),
    username: Joi.string().required(),
  })
  .or('token', 'webhook')
  .label('slack');
