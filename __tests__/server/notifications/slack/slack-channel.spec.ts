import { SlackChannelConfig } from '@src/types';
import { SlackChannel } from '@src/server/notifications';
import { createNotificationContext } from '../helpers';
import { nanoid } from 'nanoid';
import { POST_MESSAGE_URL } from '@src/server/notifications/slack/slack-channel';
import nock from 'nock';

describe('SlackChannel', () => {
  const URL =
    'https://hooks.slack.com/services/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';

  const WEBHOOK_ENDPOINT = 'https://hooks.slack.com';

  describe('constructor', () => {
    it('can construct an instance', () => {
      const config: SlackChannelConfig = {
        id: 'hook1',
        name: 'hook1',
        type: 'slack',
        webhook: URL,
      };

      const instance = new SlackChannel(config);
      expect(instance).toBeDefined();
    });
  });

  function createChannel(opts?: Partial<SlackChannelConfig>): SlackChannel {
    let config: SlackChannelConfig = {
      id: 'hook-' + nanoid(),
      name: 'names-' + nanoid(),
      type: 'slack',
    };
    if (opts) {
      config = Object.assign(config, opts);
    }
    return new SlackChannel(config);
  }

  interface DispatchResult {
    instance: SlackChannel;
    received: Record<string, any>;
  }

  async function dispatch(
    message: Record<string, any>,
    config: Partial<SlackChannelConfig>,
  ): Promise<DispatchResult> {
    const instance = createChannel(config);
    const context = createNotificationContext();
    const isWebhook = !!instance.webhook;

    let actualUri: string;
    let received;
    const baseUrl = isWebhook ? WEBHOOK_ENDPOINT : POST_MESSAGE_URL;
    const scope = nock(baseUrl)
      .post(/.*/)
      .reply(function (uri, requestBody) {
        actualUri = baseUrl + (isWebhook ? uri : '');
        received = requestBody;
        return [200];
      });

    await instance.dispatch(context, message, 'test');
    scope.done();

    expect(actualUri).toBe(instance.url);
    return { instance, received };
  }

  describe('.fetch', () => {
    jest.setTimeout(8000);

    it('can send using chat.postMessage', async () => {
      const config = {
        token: nanoid(),
        channel: '89V5MPZX',
      };

      const message = {
        str: 'string',
        num: 10,
        bool: true,
        fl: 10.29,
      };

      const { received } = await dispatch(message, config);
      expect(received.text).toBeDefined();
      expect(Array.isArray(received.blocks)).toBe(true);
      expect(received.channel).toBe(config.channel);
    });

    it('can send using Incoming Webhooks', async () => {
      const config = {
        webhook: URL,
        channel: nanoid(),
      };

      const message = {
        str: 'string',
        num: 10,
        bool: true,
        fl: 10.29,
      };

      const { received } = await dispatch(message, config);
      expect(received.text).toBeDefined();
      expect(Array.isArray(received.blocks)).toBe(true);
      expect(received.channel).toBe(config.channel);
    });
  });
});
