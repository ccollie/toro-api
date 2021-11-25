import { isObject } from 'lodash';
import { RedisStreamAggregator } from '../../src/redis';
const redisUri = global.process.env.REDIS_URI || 'localhost:6379';
const blockingInterval = 100;

let instance;
describe('RedisStreamsAggregator', function () {
  function isMessagesWellFormed(messages): void {
    expect(Array.isArray(messages)).toBe(true);
    expect(Array.isArray(messages[0])).toBe(true);
    expect(isObject(messages[0][1])).toBe(true);
  }

  describe('constructor', () => {
    it('creates and connects', function (done) {
      jest.setTimeout(15000);

      instance = new RedisStreamAggregator({
        connectionOptions: redisUri,
        blockingInterval,
      });
      instance.events.on('ready', async () => {
        expect(instance.subscriptions).toBeDefined();
        expect(instance.handles.read).toBeDefined();
        expect(instance.handles.write).toBeDefined();
        await instance.handles.write.del(
          'testId',
          'testId2',
          'testId3',
          'testId4',
        );
        done();
      });
    });
  });

  const testSubFunction = (messages) => {
    console.log(messages);
  };

  describe('.addListener()', function () {
    it('allows subscriptions to redis streams', async function () {
      await instance.subscribe('testId', testSubFunction);
      expect(Object.keys(instance.subscriptions).length).toBe(1);
      expect(instance.subscriptions.testId).toStrictEqual([1, '$']);
    });

    it('continues reading after a BLOCK timeout with no messages', function (done) {
      jest.setTimeout(blockingInterval * 2);

      const testObj = { whatwhat: 'keepReading' };
      async function keepReadingMsg(messages) {
        isMessagesWellFormed(messages);
        expect(messages[0][1]).toStrictEqual(testObj);
        await instance.unblock();
        instance.unsubscribe('keepReading', keepReadingMsg);
        done();
      }
      instance.subscribe('keepReading', keepReadingMsg).then(() => {
        setTimeout(() => {
          instance.add('keepReading', testObj);
        }, Math.floor(blockingInterval * 1.5));
      });
    });
  });

  describe('.unsubscribe()', function () {
    it('Removes subscriptions from redis streams', async function () {
      await instance.unsubscribe('testId', testSubFunction);
      expect(Object.keys(instance.subscriptions).length).toBe(0);
      expect(instance.subscriptions.testId).not.toBeUndefined();
    });
  });

  describe('.add()', function () {
    it('adds events and gets them via subscriptions', function (done) {
      let doneTwice = 0;
      function finish(): void {
        if (++doneTwice === 2) done();
      }
      const testObj = { foo: 'bar' };
      let callOnce = false;
      const testSubFunction2 = async (messages) => {
        isMessagesWellFormed(messages);
        expect(typeof messages[0][0]).toBe('string');
        expect(messages[0][1]).toStrictEqual(testObj);
        expect(instance.subscriptions.testId2[1]).not.toBe('0');
        instance.unsubscribe('testId2', testSubFunction2);
        if (callOnce) return;
        callOnce = true;
        finish();
      };

      instance.subscribe('testId2', '0', testSubFunction2).then(() => {
        instance.add('testId2', testObj).then((newOffset) => {
          expect(typeof newOffset).toBe('string'); // 1540154781259-0
          finish();
        });
      });
    });

    it('can listen to many streams', function (done) {
      jest.setTimeout(5000);

      let messages3;
      let messages4;

      async function doTest() {
        isMessagesWellFormed(messages3);
        isMessagesWellFormed(messages4);
        let twoResponses = 0;
        await instance.subscribe('testId4', '$', (msgs) => {
          if (++twoResponses === 2) done();
        });

        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        instance.unsubscribe('testId3', testFunc3);
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        instance.unsubscribe('testId4', testFunc4);
        await instance.add('testId4', { final: 'foobar' });
      }

      function testFunc3(msgs): void {
        messages3 = msgs;
        if (messages3 && messages4) doTest();
      }

      function testFunc4(msgs): void {
        messages4 = msgs;
        if (messages3 && messages4) doTest();
      }

      Promise.all([
        instance.subscribe('testId3', testFunc3),
        instance.subscribe('testId4', testFunc4),
      ]).then((numSubscriptions) => {
        Promise.all([
          instance.add('testId3', { testId3: 1 }),
          instance.add('testId4', { testId4: 50 }),
        ]).then((messages) => {});
      });
    });
  });

  describe('.disconnect()', function () {
    // Note that this timeout needs to be _less_ than the blocking interval
    // This is because its important we do not wait for a blocking call to recover before
    // disconnect. (disconnect should unblock, and this tests that)
    jest.setTimeout(blockingInterval / 2);
    it('disconnects from redis', async function () {
      await instance.disconnect();
      expect(instance.readId).toBe(false);
    });
  });
});
