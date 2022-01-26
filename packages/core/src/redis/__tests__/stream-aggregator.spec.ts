import { isObject } from '@alpen/shared';
import { delay } from '../../lib';
import { clearDb, TEST_DB } from '../../__tests__/factories';
import { RedisStreamAggregator } from '../stream-aggregator';

const blockingInterval = 100;

// errors with timeouuts: https://github.com/facebook/jest/issues/11500
// https://github.com/facebook/jest/issues/11543
jest.setTimeout(5000);

describe('RedisStreamsAggregator', () => {
  let instance: RedisStreamAggregator;

  beforeEach(async () => {
    instance = new RedisStreamAggregator({
      connection: {
        db: TEST_DB
      },
      blockingInterval,
    });

    await instance.waitUntilReady();
  }, 5000);  // https://github.com/facebook/jest/issues/11500

  afterEach(async() => {
    const client = instance.writeClient;
    await clearDb(client);
    await instance.destroy();
  }, 5000);

  function isMessagesWellFormed(messages): void {
    expect(Array.isArray(messages)).toBe(true);
    expect(typeof messages[0]).toBe('string');
    expect(isObject(messages[1])).toBe(true);
  }

  describe('constructor', () => {

    it('creates and connects',  async () => {
      jest.setTimeout(5000);

      const instance = new RedisStreamAggregator({
        blockingInterval,
      });
      await instance.waitUntilReady();

      expect(instance.subscriptionCount).toBe(0);
      expect(instance.readClient).toBeDefined();
      expect(instance.writeClient).toBeDefined();
    }, 5000);

  });

  const testSubFunction = (messages) => {
    console.log(messages);
  };

  describe('.subscribe()', () => {

    it('allows subscriptions to redis streams', async () => {
      await instance.subscribe('testId', testSubFunction);
      const subscription = instance.getSubscription('testId');
      expect(instance.subscriptionCount).toBe(1);
      expect(subscription.cursor).toBe('$');
    }, 25000);

    it('continues reading after a BLOCK timeout with no messages', async () => {
      let wasCalled = false;

      const testObj = { whatwhat: 'keepReading' };
      async function keepReadingMsg(messages) {
        isMessagesWellFormed(messages);
        expect(messages[0][1]).toStrictEqual(testObj);
        await instance.unblock();
        instance.unsubscribe('keepReading', keepReadingMsg);
        wasCalled = true;
      }

      await instance.subscribe('keepReading', keepReadingMsg);
      await delay(Math.floor(blockingInterval * 1.5));
      instance.add('keepReading', testObj);
      await delay(50);
      expect(wasCalled).toBe(true);

    }, 5000);
  });

  describe('.unsubscribe()', function () {
    it('Removes subscriptions from redis streams', async () => {
      await instance.unsubscribe('testId', testSubFunction);
      expect(instance.subscriptionCount).toBe(0);
      const subscription = instance.getSubscription('testId');
      expect(subscription).toBeUndefined();
    }, 5000);
  });

  describe('.add()', function () {
    it('adds events and gets them via subscriptions', async () => {
      let called = 0;

      const testObj = { foo: 'bar' };

      let receivedObj: Record<string, any> = null;
      let receivedId: string = null;

      const listener = async (messages) => {
        isMessagesWellFormed(messages);
        receivedId = messages[0];
        receivedObj = messages[1];
        ++called;
      };

      await instance.subscribe('testId2', listener, '0');
      const newOffset = await instance.add('testId2', testObj);
      await delay(150);

      expect(called).toBe(1);
      expect(typeof newOffset).toBe('string'); // 1540154781259-0
      expect(receivedObj).toEqual(testObj);

      const subscription = instance.getSubscription('testId2');
      expect(subscription.cursor).not.toBe('0');
    }, 5000);

    it('can listen to many streams', async () => {
      let total = 0;

      function listener1(msg: [string, any]): void {
        total = total + parseInt(msg[1].count);
      }

      function listener2(msg: [string, any]): void {
        total = total + parseInt(msg[1].count);
      }

      await instance.subscribe('stream1', listener1);
      await instance.subscribe('stream2', listener2);

      await instance.add('stream1', { count: 1 });
      await instance.add('stream2', { count: 50 });

      await delay(1000);
      expect(total).toBe(51);

    }, 5000);

  });

  describe('.disconnect()', function () {
    // Note that this timeout needs to be _less_ than the blocking interval
    // This is because its important we do not wait for a blocking call to recover before
    // disconnect. (disconnect should unblock, and this tests that)
    jest.setTimeout(blockingInterval / 2);
    it('disconnects from redis', async () => {
      await instance.disconnect();
      expect(instance.readId).toBe(null);
    });
  });
});
