import boom from '@hapi/boom';
import { NotificationContext, WebhookChannelConfig } from '@src/types';
import { createDebug, validateUrl } from '../../lib';
import { Channel } from '../channel';
import { HttpClient } from '@lib/http-client';

const debug = createDebug('notifications:webhook');

/* A channel that posts notifications to a webhook */
export class WebhookChannel extends Channel<WebhookChannelConfig> {
  readonly client: HttpClient;

  constructor(options: WebhookChannelConfig) {
    super(options);
    this.client = new HttpClient(options);
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
    return this.options.followRedirect;
  }

  /***
   * Set this to true to allow sending body for the GET method
   * This option is only meant to interact with non-compliant servers when you have no other choice.
   */
  get allowGetBody(): boolean {
    return this.options.allowGetBody;
  }

  public get url(): string {
    return (this.options as WebhookChannelConfig).url;
  }

  public set url(value: string) {
    if (!value || !validateUrl(value)) {
      throw boom.badData(`"${value}" is not a valid URI`);
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
