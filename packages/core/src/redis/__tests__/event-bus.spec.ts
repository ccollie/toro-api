import { toKeyValueList } from '../../redis';
import { getUniqueId } from '../../ids';
import { EventBus } from '../event-bus';
import { RedisStreamAggregator } from '../stream-aggregator';
import pAll from 'p-all';
import { random } from 'lodash';
import { delay } from '../../lib';

import {
  createClient,
  clearDb,
  TEST_DB,
} from '../../__tests__/factories';

describe('EventBus', () => {
  // jest.setTimeout(5000);
  let client;
  let bus: EventBus;
  let aggregator: RedisStreamAggregator;
  let key: string;

  beforeEach(async function () {
    key = 'bus-' + getUniqueId();
    client = await createClient();
    aggregator = new RedisStreamAggregator({
      connection: {
        db: TEST_DB,
        lazyConnect: false,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      }
    });
    bus = new EventBus(aggregator, key);
    await bus.waitUntilReady();
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

      const ruleId = getUniqueId();
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

  describe('getListenerCount', () => {
    it('returns the number of listeners', async () => {
      // eslint-disable-next-line camelcase
      const unsub_a = bus.on('a', () => {
        // do nothing
      });
      expect(bus.getListenerCount('a')).toBe(1);

      // eslint-disable-next-line camelcase
      const unsub_b = bus.on('b', () => {
        // do nothing
      });
      expect(bus.getListenerCount('b')).toBe(1);

      expect(bus.getListenerCount(['a', 'b'])).toBe(2);

      unsub_a();
      expect(bus.getListenerCount('a')).toBe(0);
      expect(bus.getListenerCount(['a', 'b'])).toBe(1);

      unsub_b();
      expect(bus.getListenerCount('b')).toBe(0);
      expect(bus.getListenerCount(['a', 'b'])).toBe(0);
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

      const ruleId = getUniqueId();
      await bus.emit('event.raised', {
        string: 'string',
        number: 1,
        ruleId,
      });

      await delay(200);
      expect(eventData).not.toBeUndefined();
    });

    it('receives events originating from redis', async () => {
      const data = {
        string: 'string',
        ruleId: getUniqueId(),
      };

      let received = false;
      bus.on('event.raised', (evt) => {
        received = true;
        expect(evt).toEqual(data);
      });
      await delay(500);

      await client.xadd(bus.key, '*', '__evt', 'event.raised', toKeyValueList(data));

      await delay(500);
      expect(received).toBe(true);
    });
  });
});
