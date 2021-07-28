import baseSchema from '../schemas/baseSchema';
import Joi from 'joi';
import { DurationSchema } from '../../validation/schemas';

export default baseSchema.append({
  url: Joi.string().uri().required(),
  method: Joi.string().valid('GET', 'POST').default('POST'),
  // https://github.com/sindresorhus/got#options
  headers: Joi.object()
    .default({})
    .description('additional headers to add to client'),
  responseType: Joi.string().valid('text', 'json', 'default').default('json'),
  searchParams: Joi.alternatives().try(Joi.object(), Joi.string()).description(
    // eslint-disable-next-line max-len
    'Query string that will be added to the client URL. This will override the query string in url.',
  ),
  timeout: DurationSchema,
  retry: Joi.number().integer().default(2),
  followRedirect: Joi.boolean().default(true),
  allowGetBody: Joi.boolean().default(false),
  httpSuccessCodes: Joi.array()
    .items(Joi.number().integer().min(100).max(600))
    .single()
    .description('HTTP codes to be considered as successful'),
  payload: Joi.object()
    .default({})
    .description('optional data to add to client'),
  resultMap: Joi.object()
    .optional()
    .description('optional output object mapper'),
});
