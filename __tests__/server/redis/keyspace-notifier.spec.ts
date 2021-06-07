import {
  getChannel,
  KeyspaceNotification,
  KeyspaceNotificationType,
  KeyspaceNotifier,
} from '@src/server/redis';
import {
  clearDb,
  createClient,
  DEFAULT_CLIENT_OPTIONS,
  TEST_DB,
} from '../../factories';
import * as IORedis from 'ioredis';
import { delay } from '../utils';
import { RedisClient } from 'bullmq';

const WAIT_DELAY = 100;

describe('KeyspaceNotifier', () => {
  let sut: KeyspaceNotifier;
  let client: RedisClient;
  let messages: KeyspaceNotification[];

  beforeEach(async () => {
    await clearDb();
    sut = new KeyspaceNotifier(DEFAULT_CLIENT_OPTIONS);
    client = await createClient();
    messages = [];
  });

  afterEach(async () => {
    client.disconnect();
    await sut.destroy();
  });

  function collectMessages(msg: KeyspaceNotification) {
    messages.push(msg);
  }

  describe('keyspace notifications', () => {
    it('can listen to notifications', async () => {
      const unsub = await sut.subscribeKey('foo', collectMessages);
      await client.set('foo', 12345);
      await delay(WAIT_DELAY);
      expect(messages.length).toBe(1);
      const msg = messages[0];
      const channel = getChannel(
        KeyspaceNotificationType.KEYSPACE,
        'foo',
        TEST_DB,
      );
      expect(msg.type).toBe(KeyspaceNotificationType.KEYSPACE);
      expect(msg.key).toBe('foo');
      expect(msg.channel).toBe(channel);
      expect(msg.db).toBe(TEST_DB);
      expect(msg.event).toBe('set');
      unsub();
    });

    it('captures "expire" events', async () => {
      const unsub = await sut.subscribeKey('foo', collectMessages);
      await client.set('foo', 12345);
      await delay(WAIT_DELAY);
      expect(messages.length).toBe(1);
      messages = [];
      await client.pexpire('foo', 1);
      await delay(5);
      expect(messages.length).toBe(1);
      const msg = messages[0];
      expect(msg.key).toBe('foo');
      expect(msg.event).toBe('expire');
      unsub();
    });

    it('properly unsubscribes', async () => {
      const unsub = await sut.subscribeKey('foo', collectMessages);
      await client.set('foo', 12345);
      await delay(WAIT_DELAY);
      expect(messages.length).toBe(1);
      unsub();
      messages = [];
      await client.set('foo', 54321);
      await delay(WAIT_DELAY);
      expect(messages.length).toBe(0);
    });
  });

  describe('keyevent notifications', () => {
    it('can listen to notifications', async () => {
      const unsub = await sut.subscribeEvent('set', collectMessages);
      await client.set('bar', 12345);
      await delay(WAIT_DELAY);
      expect(messages.length).toBe(1);
      const msg = messages[0];
      const channel = getChannel(
        KeyspaceNotificationType.KEYEVENT,
        'set',
        TEST_DB,
      );
      expect(msg.type).toBe(KeyspaceNotificationType.KEYEVENT);
      expect(msg.key).toBe('bar');
      expect(msg.channel).toBe(channel);
      expect(msg.db).toBe(TEST_DB);
      expect(msg.event).toBe('set');
      unsub();
    });

    it('captures "expired" events', async () => {
      const unsub = await sut.subscribeEvent('expired', collectMessages);
      await client.set('bar', 12345);
      await delay(5);
      await client.expire('bar', 1);
      await delay(1500);
      expect(messages.length).toBe(1);
      const msg = messages[0];
      expect(msg.key).toBe('bar');
      expect(msg.event).toBe('expired');
      unsub();
    });

    it('properly unsubscribes', async () => {
      const unsub = await sut.subscribeEvent('set', collectMessages);
      await client.set('bar', 12345);
      await delay(WAIT_DELAY);
      expect(messages.length).toBe(1);
      unsub();
      messages = [];
      await client.set('bar', 54321);
      await delay(50);
      expect(messages.length).toBe(0);
    });
  });
});
