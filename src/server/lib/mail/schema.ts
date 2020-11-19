import Joi from 'joi';
import { packageInfo } from '../../packageInfo';

const smtpOptionsSchema = Joi.object({
  host: Joi.string().uri(),
  port: Joi.number().integer().positive(),
  secure: Joi.boolean(),
  pool: Joi.boolean().default(false),
  auth: Joi.object({
    type: Joi.string().default('login'),
    user: Joi.string(),
    pass: Joi.string(),
    // OAuth2
    /** the registered client id of the application */
    clientId: Joi.string(),
    /** the registered client secret of the application */
    clientSecret: Joi.string(),
    /** an optional refresh token. If it is provided then Nodemailer tries
     * to generate a new access token if existing one expires or fails */
    refreshToken: Joi.string().optional(),
    /**
     * the access token for the user. Required only if refreshToken
     * is not available and there is no token refresh callback specified
     */
    accessToken: Joi.string(),
    /** an optional HTTP endpoint for requesting new access tokens.
     * This value defaults to Gmail */
    accessUrl: Joi.string().optional(),
    /** an optional expiration time for the current accessToken */
    expired: Joi.number().optional(),
  }).optional(),
  tls: Joi.object({
    rejectUnauthorized: Joi.boolean(),
  }).optional(),
});

const jsonTransportSchema = Joi.object({
  jsonTransport: Joi.boolean().required(),
});

// https://nodemailer.com/transports/ses/#example-1
const sesTransportSchema = Joi.object({
  SES: Joi.object().unknown(true),
  sendingRate: Joi.number().positive().integer().optional(),
});

const streamTransportSchema = Joi.object({
  streamTransport: Joi.boolean().required(),
  newline: Joi.string().valid('unix', 'windows'),
});

const transportSchema = Joi.alternatives().try(
  Joi.string().uri(), // connection url (smtp)
  sesTransportSchema,
  smtpOptionsSchema,
  jsonTransportSchema,
  streamTransportSchema,
);

export const defaultTransport = {
  jsonTransport: true,
};

const env = process.env.NODE_ENV;
const isDev = env === 'development';

// validator for MailServerConfig
// see https://nodemailer.com/smtp/
export default Joi.object({
  transport: transportSchema.required().default(defaultTransport),
  verifyTransport: Joi.boolean().optional().default(!isDev),
  send: Joi.boolean().falsy().optional().default(isDev),
  preview: Joi.boolean().falsy().optional().default(isDev),
  textOnly: Joi.boolean().falsy().optional().default(false),
  subjectPrefix: Joi.string().optional().default(`${packageInfo.name}: `),
  message: Joi.object({
    from: Joi.string().email().optional(),
    to: Joi.string().email().optional(),
    subject: Joi.string().optional(),
    cc: Joi.array().items(Joi.string().email()).single(),
    bcc: Joi.array().items(Joi.string().email()).single().optional(),
    sender: Joi.string().email().optional(),
  })
    .optional()
    .default({}),
})
  .label('mail notifier')
  .description('mail notifier configuration');
