import { NotifierConfig } from '@src/types';

import baseSchema from '../schemas/baseSchema';
import Joi from '@hapi/joi';
import { durationSchema } from '../../monitor/validation/joi';

type ResponseType = 'json' | 'text';

/** Configuration options for the webhook notifier */
export interface WebhookConfig extends NotifierConfig {
  /** Urls to post data to */
  urls: string[];
  /** Request headers.*/
  headers?: Record<string, any>;
  /** Response type ("text", "json") .*/
  responseType: ResponseType;
  /** Query string that will be added to the request URL. This will override
   * the query string in url */
  searchParams?: string | Record<string, string | number | boolean>;
  /** Milliseconds to wait for the server to end the response before aborting the request.
   * TimeoutError error (a.k.a. request property). By default, there's no timeout. */
  timeout: number;
  /** The number of times to retry the request */
  retry?: number;
  /** Defines if redirect responses should be followed automatically. */
  followRedirect?: boolean;
  /** optional success http status codes */
  httpSuccessCodes?: number[];
}

export default baseSchema.append({
  urls: Joi.array().items(Joi.string().uri()).single().required(),

  // https://github.com/sindresorhus/got#options
  headers: Joi.object()
    .default({})
    .description('additional headers to add to request'),
  responseType: Joi.string().valid('text', 'json', 'default').default('json'),
  searchParams: Joi.alternatives().try(Joi.object(), Joi.string()).description(
    // eslint-disable-next-line max-len
    'Query string that will be added to the request URL. This will override the query string in url.',
  ),
  timeout: durationSchema,
  retry: Joi.number().integer().default(2),
  followRedirect: Joi.boolean().default(true),
  httpSuccessCodes: Joi.array()
    .items(Joi.number().integer().min(100).max(600))
    .single()
    .description('HTTP codes to be considered as successful'),
});
