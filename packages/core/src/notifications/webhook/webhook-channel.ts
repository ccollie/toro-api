import { badData } from '@hapi/boom';
import { createDebug, validateUrl } from '../../lib';
import { Channel } from '../channel';
import { HttpClient } from '../../lib/http-client';
import { NotificationChannelProps, NotificationContext } from '../types';

const debug = createDebug('notifications:webhook');

type ResponseType = 'json' | 'text';
type WebHookMethod = 'get' | 'GET' | 'post' | 'POST';

/** Configuration options for the webhook channel */
export interface WebhookChannelConfig extends NotificationChannelProps {
  readonly type: 'webhook';
  /* Webhook target url */
  url: string;

  /** The http method to use */
  method?: WebHookMethod;
  /** Request headers.*/
  headers?: Record<string, any>;
  /** Response type ("text", "json") .*/
  responseType?: ResponseType;
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

/* A channel that posts notifications to a webhook */
export class WebhookChannel extends Channel<WebhookChannelConfig> {
  readonly client: HttpClient;

  constructor(options: WebhookChannelConfig) {
    super(options);
    this.client = new HttpClient({
      responseType: 'json',
      ...options,
    });
  }

  get method(): string {
    return this.options.method;
  }

  get headers(): Record<string, any> {
    return this.options.headers;
  }

  get timeout(): number {
    return this.options.timeout;
  }

  get retry(): number {
    return this.options.retry;
  }

  /**
   * Defines if redirect responses should be followed automatically.
   */
  get followRedirect(): boolean {
    return !!this.options?.followRedirect;
  }

  /***
   * Set this to true to allow sending body for the GET method
   * This option is only meant to interact with non-compliant servers when you have no other choice.
   */
  get allowGetBody(): boolean {
    return !!this.options?.allowGetBody;
  }

  public get url(): string {
    return (this.options as WebhookChannelConfig).url;
  }

  public set url(value: string) {
    if (!value || !validateUrl(value)) {
      throw badData(`"${value}" is not a valid URI`);
    }
    this.options.url = value;
  }

  public update(config: Partial<WebhookChannelConfig>): void {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...rest } = config;
    Object.assign(this.options, rest);
    this.client.update(config);
  }

  async dispatch(
    context: NotificationContext,
    data: Record<string, any>,
    eventName?: string,
  ): Promise<void> {
    const config = this.options as WebhookChannelConfig;
    debug(`${config.method} request to: "%s"`, config.url);

    await this.client.fetch(data);
  }
}
