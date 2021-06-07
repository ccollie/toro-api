import boom from '@hapi/boom';
import { NotificationContext, SlackChannelConfig } from '@src/types';
import { validateUrl } from '../../lib';
import { Channel } from '../channel';
import { getMessage } from './messages';
import { HttpClientConfig, HttpClient } from '@lib/http-client';

export const POST_MESSAGE_URL = 'https://slack.com/api/chat.postMessage';

export class SlackChannel extends Channel<SlackChannelConfig> {
  private client: HttpClient;
  constructor(options: SlackChannelConfig) {
    super(options);
    if (!options.webhook) {
      // if no webhook is specified, we're using chat.postMessage,
      // in which case a token is required
      if (!options.token) {
        // ??? better error type ?
        throw boom.badRequest('A token is required to use chat.postMessage');
      }
      if (!options.channel) {
        // ??? better error type ?
        throw boom.badRequest('Missing slack channel');
      }
    }
    this.createClient();
  }

  private get token(): string {
    return this.options.token;
  }

  get webhook(): string {
    return this.options.webhook;
  }

  set webhook(value: string) {
    if (!validateUrl(value)) {
      throw boom.badData(`slack webhook url is invalid: "${value}"`);
    }
    this.update({ webhook: value });
  }

  get url(): string {
    return this.options.webhook || POST_MESSAGE_URL;
  }

  public get channel(): string {
    return this.options.channel;
  }

  public update(options: Partial<SlackChannelConfig>): void {
    super.update(options);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, name, webhook, ...rest } = options;
    this.client.update({ url: webhook });
    this.webhook = webhook;
    Object.assign(this.options, rest);
  }

  private createClient(): HttpClient {
    const options: HttpClientConfig = {
      url: this.url,
      responseType: 'json',
      method: 'POST',
      payload: {
        channel: this.channel,
      },
    };

    if (!this.webhook) {
      options.headers = {
        Authorization: `Bearer ${this.token}`,
      };
    }

    return (this.client = new HttpClient(options));
  }

  async dispatch(
    context: NotificationContext,
    data: Record<string, any>,
    eventName?: string,
  ): Promise<void> {
    const slackMessage = getMessage(context, eventName, data);
    if (this.channel) {
      slackMessage['channel'] = this.channel;
    }

    await this.client.fetch(slackMessage);
  }
}
