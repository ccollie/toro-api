export interface SmtpConfigOptions {
  /** the hostname or IP address to connect to (defaults to ‘localhost’) */
  host: string;
  /** the port to connect to (defaults to 587 if is secure is false or 465 if true) */
  port?: number;
  secure?: boolean;
  pool?: boolean;
  /** defines authentication data */
  auth?: {
    type?: string;
    user?: string;
    pass?: string;
    // OAuth2
    /** the registered client id of the application */
    clientId?: string;
    /** the registered client secret of the application */
    clientSecret?: string;
    /** an optional refresh token. If it is provided then Nodemailer tries
     * to generate a new access token if existing one expires or fails */
    refreshToken?: string;
    /**
     * the access token for the user. Required only if refreshToken
     * is not available and there is no token refresh callback specified
     */
    accessToken?: string;
    /** an optional HTTP endpoint for requesting new access tokens. This value defaults to Gmail */
    accessUrl?: string;
    /** an optional expiration time for the current accessToken */
    expired?: number;
  };
  /**
   * defines additional node.js TLSSocket options to be passed to the
   * socket constructor, eg. {rejectUnauthorized: true}.
   */
  tls: {
    rejectUnauthorized: boolean;
  };
}

export type SmtpTransportOpts = string | SmtpConfigOptions;

export interface JsonTransportOpts {
  jsonTransport: boolean;
}

export interface StreamTransportOpts {
  streamTransport: boolean;
  newline?: 'unix' | 'windows';
  buffer?: boolean;
}

export type MailTransportOpts =
  | SmtpTransportOpts
  | JsonTransportOpts
  | StreamTransportOpts;

export interface MailMessageDefaults {
  from?: string;
  to?: string;
  subject?: string;
  cc?: string[];
  bcc?: string[];
  sender?: string;
}

export interface MailServerConfig {
  transport: MailTransportOpts;
  verifyTransport: boolean;
  /**
   * whether or not to sendMail emails, defaults to false for development and test environments,
   * and true for all others (via process.env.NODE_ENV)
   */
  send: boolean;
  subjectPrefix?: string;
  textOnly?: boolean;
  message?: MailMessageDefaults;
}
