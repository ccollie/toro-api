import { EventBus } from '../common';
import { RedisStreamAggregator } from '../common';
import { randomString, delay } from '../utils';
import pAll from 'p-all';
import { random } from 'lodash';
import {
  createClient,
  clearDb,
  DEFAULT_CONNECTION_OPTIONS,
} from '../factories';

describe('EventBus', () => {
  // jest.setTimeout(5000);
  let client;
  let bus: EventBus;
  let aggregator: RedisStreamAggregator;
  let key: string;

  beforeEach(async function () {
    key = 'bus-' + randomString(8);
    client = await createClient();
    const opts = { connectionOptions: DEFAULT_CONNECTION_OPTIONS };
    aggregator = new RedisStreamAggregator(opts);
    bus = new EventBus(aggregator, key);
    await aggregator.connect();
  });

  afterEach(async function () {
    bus.destroy();
    await Promise.all([aggregator.destroy(), clearDb(client)]);
    await client.disconnect();
  });

  function postEvent(event, data = {}) {
    return bus.emit(event, data);
  }

  describe('.emit', () => {
    jest.setTimeout(10000);

    it('should emit an event', async () => {
      let eventData = null;
      bus.on('event.raised', (evt) => {
        eventData = evt;
      });

      const ruleId = randomString();
      await bus.emit('event.raised', {
        string: 'string',
        number: 1,
        ruleId,
      });
      await delay(200);
      expect(eventData).not.toBeUndefined();
      expect(eventData.ruleId).toEqual(ruleId);
    });
  });

  describe('.getLength', () => {
    it('returns the length of the stream', async () => {
      let len = await bus.getLength();
      expect(len).toBe(0);

      const calls = [];
      const count = random(5, 10);
      for (let i = 0; i < count; i++) {
        calls.push(() => postEvent('clean', { i }));
      }
      await pAll(calls, { concurrency: 5 });

      len = await bus.getLength();
      expect(len).toBe(count);
    });
  });

  describe('.cleanup', () => {
    it('trims stream to an approximate length', async () => {
      const calls = [];
      for (let i = 0; i < 200; i++) {
        calls.push(() => postEvent('clean', { i }));
      }

      await pAll(calls, { concurrency: 20 });
      await bus.cleanup(5);

      const len = await bus.getLength();
      expect(len).toBeLessThan(100);
      expect(len).not.toBeLessThan(5);
    });
  });

  describe('remote', () => {
    it('receives events from server', async () => {
      const otherBus = new EventBus(aggregator, key);

      let eventData = null;
      otherBus.on('event.raised', (evt) => {
        eventData = evt;
      });

      const ruleId = randomString();
      await bus.emit('event.raised', {
        string: 'string',
        number: 1,
        ruleId,
      });

      await delay(200);
      expect(eventData).not.toBeUndefined();

    });
  });
});
