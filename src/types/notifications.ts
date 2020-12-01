import { MailMessageDefaults, MailTransportOpts } from './mail';
import { AppInfo } from './app-info';

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

export interface NotificationChannel {
  id: string;
  readonly type: string;
  name: string;
  enabled: boolean;
  options: ChannelConfig;
  dispatch(
    context: NotificationContext,
    data: Record<string, any>,
    eventName?: string,
  ): void | Promise<void>;
}

export interface NotificationChannelPlugin {
  name: string;
  schema?: any; // todo: use joi definition
  createChannel(pluginData: any): NotificationChannel;
}

export interface NotificationContext {
  host: {
    id: string;
    name: string;
    uri: string;
  };
  app: AppInfo;
  env: string;
}

export interface ChannelConfig {
  id?: string;
  type: string;
  name: string;
  enabled?: boolean;
}

/** Configuration options for a SlackChannel */
export interface SlackChannelConfig extends ChannelConfig {
  type: 'slack';
  /** Auth token if using the chat.postMessage method of posting */
  token?: string;
  /** The slack channel, if using the chat.postMessage method of posting */
  channel?: string;
  /** Slack webhook URL */
  webhook?: string;
}

export interface MailChannelConfig extends ChannelConfig {
  type: 'mail';
  recipients: string[];
}

type ResponseType = 'json' | 'text';
type WebHookMethod = 'get' | 'GET' | 'post' | 'POST';

/** Configuration options for the webhook channel */
export interface WebhookChannelConfig extends ChannelConfig {
  type: 'webhook';
  id?: string;
  name: string;
  enabled?: boolean;

  /* Webhook target url */
  url: string;

  /** The http method to use */
  method?: WebHookMethod;
  /** Request headers.*/
  headers?: Record<string, any>;
  /** Response type ("text", "json") .*/
  responseType: ResponseType;
  /** Milliseconds to wait for the server to end the response before aborting the client.
   * TimeoutError error (a.k.a. client property). By default, there's no timeout. */
  timeout?: number;
  /** The number of times to retry the client */
  retry?: number;
  /** Defines if redirect responses should be followed automatically. */
  followRedirect?: boolean;
  /**
   * Set this to true to allow sending body for the GET method.
   * This option is only meant to interact with non-compliant servers when you have no other choice.
   * */
  allowGetBody?: boolean;
  /** Optional success http status codes. Defaults to 200 - 206 */
  httpSuccessCodes?: number[];
  /** Optional payload to include with the hook */
  payload?: Record<string, any>;
  /** Optional output mapper */
  resultMap?: Record<string, any>;
}
