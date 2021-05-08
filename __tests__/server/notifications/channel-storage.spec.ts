import {
  Channel,
  ChannelEvents,
  ChannelStorage,
  MailChannel,
  SlackChannel,
  WebhookChannel,
} from '../../../src/server/notifications';
import { EventBus } from '../../../src/server/redis';
import { delay, randomId } from '../utils';
import {
  ChannelConfig,
  HostConfig,
  MailChannelConfig,
  SlackChannelConfig,
  WebhookChannelConfig,
} from '../../../src/types';
import random from 'lodash/random';
import { HostManager } from '../../../src/server/hosts';
import { clearDb, DEFAULT_CLIENT_OPTIONS } from '../../factories';
import { RedisClient } from 'bullmq';

describe('ChannelStorage', () => {
  let client: RedisClient;
  let bus: EventBus;
  let sut: ChannelStorage;
  let hostManager: HostManager;

  function createHostConfig(defaults?: Partial<HostConfig>): HostConfig {
    return {
      allowDynamicQueues: false,
      autoDiscoverQueues: false,
      connection: DEFAULT_CLIENT_OPTIONS,
      queues: [],
      channels: [],
      id: randomId(),
      name: 'host-' + randomId(),
      ...(defaults || {}),
    };
  }

  beforeEach(async function () {
    const config = createHostConfig();
    hostManager = new HostManager(config);
    await hostManager.waitUntilReady();
    bus = hostManager.bus;
    client = hostManager.client;
    await bus.waitUntilReady();
    sut = new ChannelStorage(hostManager);
  });

  afterEach(async function () {
    sut && sut.destroy();
    await Promise.allSettled([hostManager.destroy(), clearDb(client)]);
  });

  function addChannel(config?: ChannelConfig): Promise<Channel> {
    if (!config) {
      config = {
        type: 'slack',
        name: 'Dev Slack Channel',
        webhook:
          'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
      } as SlackChannelConfig;
    }
    return sut.addChannel(config);
  }

  async function addWebhookChannel(): Promise<WebhookChannel> {
    const config: WebhookChannelConfig = {
      type: 'webhook',
      method: 'POST',
      name: 'Captain',
      responseType: 'json',
      url: 'http://acme.com/webhook',
    };
    return (await addChannel(config)) as WebhookChannel;
  }

  describe('.addChannel', () => {
    it('can add a channel', async () => {
      const config: SlackChannelConfig = {
        id: 'dev.slack',
        type: 'slack',
        name: 'Dev Slack Channel',
        webhook:
          'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXXXXXX',
      };
      const channel = await sut.addChannel(config);
      expect(channel).toBeInstanceOf(SlackChannel);
      expect(channel).toBeDefined();
      expect(channel.type).toBe('slack');
      expect((channel as SlackChannel).webhook).toBe(config.webhook);
      expect(channel.name).toBe(config.name);

      const exists = await client.hexists(sut.hashKey, channel.id);
      expect(!!exists).toBe(true);
    });

    it('disallows duplicate ids', async () => {
      const config: MailChannelConfig = {
        type: 'mail',
        name: 'Devops Staging',
        recipients: ['no-reply@acme.co'],
      };
      const mailChannel = await addChannel(config);

      config.id = mailChannel.id;
      const host = hostManager.name;
      const expected = `A channel with id "${config.id}" already exists in host "${host}"`;
      expect(addChannel(config)).rejects.toThrowError(expected);
    });

    it('emits an event when a channel is added', async () => {
      let eventData: Record<string, any> = null;
      bus.on(ChannelEvents.Added, (evt) => {
        eventData = evt;
      });
      const channel = await addChannel();
      await delay(450);
      expect(eventData).toBeDefined();
      expect(eventData.id).toEqual(channel.id);
    });
  });

  describe('.updateChannel', () => {
    it('can update a channel', async () => {
      const webhook = await addWebhookChannel();
      webhook.url = 'http://nowhere.com/hooks';
      webhook.name = 'changed - ' + randomId(10);

      await sut.updateChannel(webhook);
      const fromRedis = (await sut.getChannel(webhook.id)) as WebhookChannel;
      expect(fromRedis).toBeDefined();
      expect(webhook.url).toBe(fromRedis.url);
      expect(webhook.name).toBe(fromRedis.name);
    });
  });

  describe('deleteChannel', () => {
    it('can delete a channel by id', async () => {
      const channel = await addChannel();

      const exists = await client.hexists(sut.hashKey, channel.id);
      expect(!!exists).toBe(true);

      const deleted = await sut.deleteChannel(channel.id);
      expect(deleted).toBe(true);
      const res = await client.hexists(sut.hashKey, channel.id);
      expect(!!res).toBe(false);
    });

    it('can delete a channel by channel object', async () => {
      const channel = await addChannel();

      const deleted = await sut.deleteChannel(channel);
      expect(deleted).toBe(true);
      const exists = await sut.channelExists(channel.id);
      expect(!!exists).toBe(false);
    });

    it('returns false for a non-existent key', async () => {
      const invalidId = randomId(6);

      let exists = await sut.channelExists(invalidId);
      expect(!!exists).toBe(false);

      const deleted = await sut.deleteChannel(invalidId);
      expect(deleted).toBe(false);
    });

    it('raises an event upon successful deletion of a channel', async () => {
      let eventData;
      bus.on(ChannelEvents.Deleted, (evt) => {
        eventData = evt;
      });

      const channel = await addChannel();
      await delay(50);

      await sut.deleteChannel(channel);
      await delay(200);
      expect(eventData).toBeDefined();
      expect(eventData.id).toEqual(channel.id);
    });
  });

  describe('getChannel', () => {
    it('can get a channel by id', async () => {
      const config: MailChannelConfig = {
        id: randomId(6),
        type: 'mail',
        name: 'Devops Staging',
        recipients: ['no-reply@acme.co'],
      };

      await addChannel(config);
      const added = (await sut.getChannel(config.id)) as MailChannel;
      expect(added).toBeDefined();
      expect(added.type).toBe(config.type);
      expect(added.name).toBe(config.name);
      expect(added.recipients).toStrictEqual(config.recipients);
    });
  });

  describe('.getChannels', () => {
    it('can return all channels', async () => {
      const count = 5;
      const ids: string[] = [];

      for (let i = 0; i < count; i++) {
        const channel = await addChannel();
        ids.push(channel.id);
      }

      const channels = await sut.getChannels();
      expect(channels.length).toBe(count);

      const toDelete = random(1, count);
      const expectedCount = count - toDelete;

      for (let i = 0; i < toDelete; i++) {
        await sut.deleteChannel(ids[i]);
      }

      const otherChannels = await sut.getChannels();
      expect(otherChannels.length).toBe(expectedCount);
    });
  });

  describe('.getChannelCount', () => {
    it('can get channel count', async () => {
      const count = random(3, 6);

      for (let i = 0; i < count; i++) {
        await addChannel();
      }

      const actual = await sut.getChannelCount();
      expect(actual).toBe(count);
    });
  });

  describe('.channelExists', () => {
    it('returns true if a channel exists', async () => {
      const channel = await addWebhookChannel();
      const exists = await sut.channelExists(channel.id);
      expect(exists).toBe(true);
    });

    it('returns FALSE if a channel does not exist', async () => {
      const notExistsId = randomId();
      const exists = await sut.channelExists(notExistsId);
      expect(exists).toBe(false);
    });
  });
});
