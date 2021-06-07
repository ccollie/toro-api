import { clearDb, createClient } from '../../factories';
import { parseMessageResponse } from '@server/redis';
import sample from 'lodash/sample';
import random from 'lodash/random';
import isEmpty from 'lodash/isEmpty';
import { nanoid } from 'nanoid';
import pAll from 'p-all';
import { getUniqueId } from '@server/lib';

describe('timeseries', () => {
  let client;

  beforeEach(async () => {
    client = await createClient();
    await clearDb(client);
  });

  afterEach(async () => {
    await clearDb(client);
    return client.quit();
  });

  function callMethod(key, name, ...args) {
    return client.timeseries(key, name, ...args);
  }

  function insertData(key, timestamp, data) {
    let values: string;
    if (typeof data == 'object') {
      values = JSON.stringify(data);
    } else {
      values = '' + data;
    }
    return callMethod(key, 'add', timestamp, values);
  }

  async function getValue(key: string, timestamp): Promise<string> {
    return callMethod(key, 'get', timestamp);
  }

  async function getObjectValue(key: string, timestamp) {
    const value = await getValue(key, timestamp);
    return !isEmpty(value) ? JSON.parse(value) : null;
  }

  describe('add', () => {
    const KEY = 'ts:add';

    it('should add a value to the set', async () => {
      const data = { beers: 30 };
      await insertData(KEY, 3000, data);

      const size = await callMethod(KEY, 'size');
      expect(size).toEqual(1);

      const response = await callMethod(KEY, 'get', 3000).then(JSON.parse);

      expect(response).toEqual(data);
    });

    it('returns the timestamp', async () => {
      const data = { beers: 30 };
      const ts = await insertData(KEY, 3000, data);

      expect(parseInt(ts)).toEqual(3000);
    });

    it('interprets "*" as the current server TIME', async () => {
      const ts = await insertData(KEY, '*', 'data');
      const time = await client.time();
      const timestamp = time[0];
      expect(ts).toEqual(timestamp);
    });

    it('allows arbitrary data to be associated with a timestamp', async () => {
      const data = {
        bool: true,
        int: 12345,
        string: 'bazinga',
        float: 123.456,
      };
      await insertData(KEY, 1000, data);

      const actual = await getObjectValue(KEY, 1000);

      expect(actual).toEqual(data);
    });

    it('disallows duplicate values', async () => {
      await insertData(KEY, 1000, 'data');
      await insertData(KEY, 1000, 'data');
      const count = await client.zlexcount(KEY, '-', '+');
      expect(count).toEqual(1);
    });

    it('throws on mismatched key/value count', async () => {
      await callMethod(KEY, 'add', 1000, 'last_name').catch((e) =>
        expect(e.message).toMatch(/Number of arguments must be even/),
      );
    });

    it('disallows non-numeric timestamps', async () => {
      await callMethod(KEY, 'add', 'not-a-number', 'value', 10).catch((e) =>
        expect(e.message).toMatch(/timestamp must be a number/),
      );
    });

    it('allows bigint/snowflake timestamps', async () => {
      const id = getUniqueId();
      const data = { rand: getUniqueId() };
      await insertData(KEY, id, data);
      const response = await callMethod(KEY, 'get', id).then(JSON.parse);

      expect(response).toEqual(data);
    });
  });

  describe('bulkAdd', () => {
    const KEY = 'ts:add';

    const names = ['alice', 'bob', 'charlie'];
    const states = ['ready', 'active', 'waiting', 'complete'];

    function generateRecord() {
      return {
        name: sample(names),
        state: sample(states),
        age: random(18, 65),
      };
    }

    it('should add values to the set', async () => {
      const start_ts = 1488823384;
      const data = [];

      for (let i = 0; i < 20; i++) {
        data.push(start_ts + i, generateRecord());
      }

      const args = data.map((x, index) => {
        return typeof x === 'object' ? JSON.stringify(x) : x;
      });
      const added = await client.timeseries(KEY, 'bulkAdd', ...args);

      const size = await callMethod(KEY, 'size');
      expect(size).toEqual(20);

      const response = await getRange(client, KEY, '-', '+');
      const actual = response.reduce(
        (res, x) => res.concat([x.id, JSON.parse(x.data)]),
        [],
      );
      expect(actual).toEqual(data);
    });
  });

  describe('get', () => {
    const KEY = 'ts:get';

    it('returns the value associated with a timestamp', async () => {
      const data = nanoid();
      await insertData(KEY, 1005, data);

      const value = await getValue(KEY, 1005);

      expect(value).toEqual(data);
    });

    it('substitutes "*" for the current server time"', async () => {
      const data = nanoid();
      await insertData(KEY, '*', data);

      const value = await getValue(KEY, '*');

      expect(value).toEqual(data);
    });

    it('substitutes "-" for the first timestamp"', async () => {
      const expected = nanoid();
      await insertData(KEY, '100', expected);
      await insertData(KEY, '200', nanoid());

      const actual = await getValue(KEY, '-');

      expect(actual).toEqual(expected);
    });

    it('substitutes "+" for the last timestamp"', async () => {
      const expected = nanoid();
      await insertData(KEY, '100', nanoid());
      await insertData(KEY, '150', nanoid());
      await insertData(KEY, '200', expected);

      const actual = await getValue(KEY, '+');

      expect(actual).toEqual(expected);
    });

    it('disallows non-numeric timestamps', async () => {
      await getValue(KEY, 'not-a-number').catch((e) =>
        expect(e.message).toMatch(/timestamp must be a number/),
      );
    });
  });

  describe('pop', () => {
    const KEY = 'ts:pop';

    async function popValue(timestamp: number | string): Promise<string> {
      return callMethod(KEY, 'pop', timestamp);
    }

    it('returns and removes the value associated with a timestamp', async () => {
      const data = nanoid();
      const timestamp = 1005;
      await insertData(KEY, timestamp, data);

      let value = await popValue(timestamp);
      expect(value).toEqual(data);

      value = await getValue(KEY, timestamp);
      expect(value).toBeNull();
    });

    it('substitutes "*" for the current server time"', async () => {
      const data = nanoid();
      await insertData(KEY, '*', data);

      const value = await popValue('*');

      expect(value).toEqual(data);
    });

    it('disallows non-numeric timestamps', async () => {
      await popValue('not-a-number').catch((e) =>
        expect(e.message).toMatch(/timestamp must be a number/),
      );
    });
  });

  describe('exists', () => {
    const KEY = 'ts:exist';

    it('should return true if the timestamp exists', async () => {
      await callMethod(KEY, 'add', 1005, 'data i want to store');

      const exists = await callMethod(KEY, 'exists', 1005);

      expect(exists).toBe(1);
    });

    it('should NOT return true for a non-existent timestamp', async () => {
      await callMethod(KEY, 'add', 1005, 'data');

      const exists = await callMethod(KEY, 'exists', 9999);

      expect(exists).toBe(0);
    });
  });

  describe('set', () => {
    const start_ts = 1511885909;
    const KEY = 'ts:set';

    function set(timestamp, value) {
      let data: string;

      if (typeof value === 'object') {
        data = JSON.stringify(value);
      } else {
        data = `${value}`;
      }

      return callMethod(KEY, 'set', timestamp, data);
    }

    it('should create the value if it does not exist', async () => {
      const data = {
        active: 1,
        waiting: 2,
      };

      await set(start_ts, data);
      const actual = await getObjectValue(KEY, start_ts);
      expect(actual).toEqual(data);
    });

    it('should set the values', async () => {
      const data = {
        active: 1,
        waiting: 2,
        completed: 3,
        failed: 4,
      };

      const newValues = {
        active: 4,
        waiting: 3,
        completed: 2,
        failed: 1,
      };

      await insertData(KEY, start_ts, data);

      await set(start_ts, newValues);

      const actual = await getObjectValue(KEY, start_ts);
      expect(actual).toEqual(newValues);
    });

    it('should disallow non-numeric timestamps', async () => {
      await set('not-a-number', 'value').catch((e) =>
        expect(e.message).toMatch(/timestamp must be a number/),
      );
    });
  });

  describe('updateJson', () => {
    const start_ts = 1511885909;
    const KEY = 'ts:update';

    function update(timestamp, value) {
      let data: string;

      if (typeof value === 'object') {
        data = JSON.stringify(value);
      } else {
        data = `${value}`;
      }

      return callMethod(KEY, 'updateJson', timestamp, data).then(JSON.parse);
    }

    it('should create the value if it does not exist', async () => {
      const data = {
        number: 10,
        string: nanoid(),
        boolean: true,
        float: 3.5,
        obj: {
          id: getUniqueId(),
          items: [2, 'a', 1.25, false],
        },
      };

      const actual = await update(start_ts, data);
      expect(actual).toEqual(data);
    });

    it('updates the value', async () => {
      const original = {
        number: 10,
        string: nanoid(),
        boolean: true,
        float: 3.5,
        obj: {
          id: getUniqueId(),
          items: [2, 'a', 1.25, false],
        },
      };

      await insertData(KEY, start_ts, original);

      const updated = {
        number: 40,
        obj: { id: getUniqueId(), other: { thing: 20 } },
        float: 509.1,
      };

      await update(start_ts, updated);

      const actual = await getObjectValue(KEY, start_ts);
      expect(actual.number).toBe(updated.number);
      expect(actual.float).toBe(updated.float);
      expect(actual.obj).toEqual(updated.obj);
    });
  });

  describe('del', () => {
    const TIMESERIES_KEY = 'ts:del';

    function del(...keys) {
      const args = [].concat(...keys);
      return callMethod(TIMESERIES_KEY, 'del', ...args);
    }

    it('deletes a value from the set', async () => {
      const id = await callMethod(TIMESERIES_KEY, 'add', 1000, 'beer');
      const count = await del(id);
      expect(count).toBe(1);
    });

    it('handles "-" for the first item"', async () => {
      const expected = nanoid();
      await insertData(TIMESERIES_KEY, '100', expected);
      await insertData(TIMESERIES_KEY, '200', nanoid());

      const actual = await del('-');
      expect(actual).toBe(1);

      const missing = await getObjectValue(TIMESERIES_KEY, '100');
      expect(missing).toBe(null);
    });

    it('substitutes "+" for the last item"', async () => {
      const expected = nanoid();
      await insertData(TIMESERIES_KEY, '100', nanoid());
      await insertData(TIMESERIES_KEY, '150', nanoid());
      await insertData(TIMESERIES_KEY, '200', expected);

      const actual = await del('+');
      expect(actual).toBe(1);

      const missing = await getObjectValue(TIMESERIES_KEY, '200');
      expect(missing).toBe(null);
    });

    it('allows a variable amount of keys', async () => {
      const start_ts = 1488823384;
      const samples_count = 20;

      const data = [];

      for (let i = 0; i < samples_count; i++) {
        data.push(i);
      }

      await insertMany(client, TIMESERIES_KEY, start_ts, samples_count, data);
      const items = await getRange(client, TIMESERIES_KEY, '-', '+');
      const ids = items.map((x) => x.data);

      const count = await del(ids);
      expect(count).toEqual(ids.length);
    });
  });

  describe('count', () => {
    const KEY = 'ts:count';

    it('returns the count of elements between 2 timestamps', async () => {
      await addValues(
        client,
        KEY,
        1000,
        10,
        2000,
        20,
        3000,
        30,
        4000,
        40,
        5000,
        50,
        6000,
        60,
      );
      const count = await callMethod(KEY, 'count', 2000, 5000);
      expect(count).toEqual(4);
    });

    it('supports special range characters', async () => {
      await addValues(
        client,
        KEY,
        1000,
        10,
        2000,
        20,
        3000,
        30,
        4000,
        40,
        5000,
        50,
        6000,
        60,
        7000,
        60,
      );

      let count = await callMethod(KEY, 'count', '-', '+');
      expect(count).toEqual(7);

      count = await callMethod(KEY, 'count', 3000, '+');
      expect(count).toEqual(5);

      count = await callMethod(KEY, 'count', '-', 4000);
      expect(count).toEqual(4);
    });
  });

  describe('size', () => {
    const KEY = 'ts:size';

    async function addValues(...args) {
      const values = [].concat(...args);
      const pipeline = client.pipeline();
      for (let i = 0; i < values.length; i += 2) {
        const ts = values[i];
        const val = values[i + 1];
        pipeline.timeseries(KEY, 'add', ts, val);
      }

      await pipeline.exec();
    }

    it('returns the correct list size', async () => {
      let size = await callMethod(KEY, 'size');
      expect(size).toEqual(0);

      await addValues(1005, 200);
      await addValues(1000, 10, 2000, 20, 3000, 30);
      size = await callMethod(KEY, 'size');
      expect(size).toBe(4);
    });
  });

  describe('range', () => {
    const KEY = 'ts:range';

    const start_ts = 1511885909;
    const samples_count = 50;

    function _insert_data(start_ts, samples_count, value) {
      return insertMany(client, KEY, start_ts, samples_count, value);
    }

    function range(min, max, ...args) {
      return getRange(client, KEY, min, max, ...args);
    }

    it('should support getting all values', async () => {
      const data = [];

      for (let i = 0; i < samples_count; i++) {
        data.push((i + 1) * 5);
      }

      await _insert_data(start_ts, samples_count, data);
      let response = await range('-', '+');
      const actual = response.map((x) => parseInt(x.data, 10));

      expect(actual.length).toEqual(data.length);
      expect(actual[0]).toEqual(data[0]);
      expect(actual[actual.length - 1]).toEqual(data[data.length - 1]);
    });

    it('should support an offset and count', async () => {
      const data = [];

      for (let i = 0; i < samples_count; i++) {
        data.push((i + 1) * 5);
      }

      await _insert_data(start_ts, samples_count, data);
      const response = await range(
        start_ts,
        start_ts + samples_count,
        'LIMIT',
        1,
        4,
      );
      const actual = response.map((x) => parseInt(x.data, 10));
      expect(actual.length).toEqual(4);
      expect(actual[0]).toEqual(data[1]);
      expect(actual[3]).toEqual(data[4]);
    });

    it('supports special range syntax', async () => {
      const data = [];

      const calls = [];
      for (let i = 1000; i < 10000; i += 1000) {
        data.push(i);
        calls.push(() => (client as any).timeseries(KEY, 'add', i, i));
      }

      await pAll(calls, { concurrency: 4 });

      const checkRange = async (min, max, expected) => {
        const response = await range(min, max);
        const actual = response.map((x) => parseInt(x.data));
        try {
          expect(actual).toEqual(expected);
        } catch (e) {
          console.log(e);
          throw new Error(`Failed range query with min = ${min} max = ${max}`);
        }
      };

      await checkRange('-', '+', data);
      await checkRange(
        3000,
        '+',
        data.filter((x) => x >= 3000),
      );
      await checkRange(
        '-',
        4000,
        data.filter((x) => x < 4000),
      );

      // todo ( and [
    });
  });

  describe('revrange', () => {
    const KEY = 'ts:rev-range';

    const start_ts = 1511785509;
    const samples_count = 50;

    function _insert_data(start_ts, samples_count, value) {
      return insertMany(client, KEY, start_ts, samples_count, value);
    }

    function get_range(max, min, ...args) {
      return getRevRange(client, KEY, max, min, ...args);
    }

    it('should support getting all values', async () => {
      const data = [];

      for (let i = 0; i < samples_count; i++) {
        data.push((i + 1) * 5);
      }

      await _insert_data(start_ts, samples_count, data);
      let response = await get_range('+', '-');
      const actual = response.map((x) => parseInt(x.data, 10));
      const reversed = reverse(data);

      expect(actual).toEqual(reversed);
    });

    it('should support an offset and count', async () => {
      const data = [];

      for (let i = 0; i < samples_count; i++) {
        data.push((i + 1) * 5);
      }

      await _insert_data(start_ts, samples_count, data);
      const max = start_ts + samples_count;
      const min = start_ts;

      const OFFSET = 1;
      const COUNT = 4;

      const response = await get_range(max, min, 'LIMIT', OFFSET, COUNT);
      const actual = response.map((x) => parseInt(x.data, 10));
      expect(actual.length).toEqual(COUNT);
      const reversed = reverse(data).slice(OFFSET, OFFSET + COUNT);
      expect(actual).toEqual(reversed);
    });

    describe('supports special range syntax', async () => {
      const data = [];

      for (let i = 1000; i < 10000; i += 1000) {
        data.push(i);
      }

      const cases = [
        ['+', '-', data],
        ['+', 3000, data.filter((x) => x <= 3000)],
        [4000, '-', data.filter((x) => x >= 4000)],
      ];
      test.each(cases)(
        'revrange[%p .. %p]',
        async (max, min, expected: any[]) => {
          await _insert_data(start_ts, data.length, data);
          const range = await get_range(max, min);
          const actual = range.map((x) => parseInt(x.data));
          expect(actual).toEqual(reverse(expected));
        },
      );

      // todo ( and [
    });
  });

  describe('remrange', () => {
    const start_ts = 1488823384;
    const samples_count = 50;
    const KEY = 'ts:remrange';

    function getSize() {
      return callMethod(KEY, 'size');
    }

    async function getSpan() {
      const response = await callMethod(KEY, 'span');
      return [parseInt(response[0], 10), parseInt(response[1], 10)];
    }

    it('should remove data based on range', async () => {
      const data = [];
      for (let i = 0; i < samples_count; i++) {
        data.push(i);
      }

      await insertMany(client, KEY, start_ts, data.length, data);

      const mid = data.length / 2;
      const mid_ts = start_ts + mid;
      const end_ts = start_ts + data.length;

      const count = await callMethod(KEY, 'remrange', mid_ts, end_ts);

      const remaining = await getSize();
      expect(remaining).toEqual(count);

      const interval = await getSpan();
      expect(interval.length).toEqual(2);
      expect(interval[0]).toEqual(start_ts);
      expect(interval[1]).toEqual(start_ts + mid - 1);
    });

    it('should handle the LIMIT option', async () => {
      const data = [];
      for (let i = 0; i < samples_count; i++) {
        data.push(i);
      }

      await insertMany(client, KEY, start_ts, data.length, data);

      const mid = data.length / 2;
      const mid_ts = start_ts + mid;
      const end_ts = start_ts + data.length;

      const count = await callMethod(
        KEY,
        'remrange',
        mid_ts,
        end_ts,
        'LIMIT',
        0,
        10,
      );
      expect(count).toEqual(10);

      const size = await getSize();
      expect(size).toEqual(data.length - count);
    });
  });

  describe('span', () => {
    const KEY = 'timeseries:span';

    async function addValues(...args) {
      const values = [].concat(...args);
      const pipeline = client.pipeline();
      for (let i = 0; i < values.length; i += 2) {
        const ts = values[i];
        const val = values[i + 1];
        pipeline.timeseries(KEY, 'add', ts, val);
      }

      await pipeline.exec();
    }

    it('should return the first and last timestamp', async () => {
      await addValues(1005, 200);
      await addValues(1000, 10, 2000, 20, 7500, 30);
      await addValues(6007, 400);

      const actual = await callMethod(KEY, 'span');
      expect(actual).toStrictEqual(['1000', '7500']);
    });

    it('should return the same timestamp for start and end if there is only one entry', async () => {
      await callMethod(KEY, 'add', 6007, 400);

      const actual = await callMethod(KEY, 'span');
      expect(actual).toStrictEqual(['6007', '6007']);
    });
  });

  describe('truncate', () => {
    const KEY = 'ts:truncate';
    const startTs = 3000;

    async function insertValues(interval = 100): Promise<number[]> {
      const data = [];
      const sampleCount = random(10, 20);

      const pipeline = client.pipeline();
      for (let i = 0; i < sampleCount; i++) {
        const ts = startTs + i * interval;
        data.push(ts);
        pipeline.timeseries(KEY, 'add', ts, ts);
      }

      await pipeline.exec();

      return data;
    }

    function truncate(period: number) {
      return callMethod(KEY, 'truncate', period);
    }

    it('truncates all but the last N units', async () => {
      const INTERVAL = 50;
      const COUNT = 3;
      const data = await insertValues(INTERVAL);
      const retention = INTERVAL * COUNT;

      const removed = await truncate(retention);
      expect(removed).toBe(data.length - COUNT);

      const response = await getRange(client, KEY, '-', '+');

      const scores = response.map((x) => parseInt(x.data));
      expect(scores.length).toEqual(COUNT + 1);
      expect(scores[scores.length - 1] - scores[0]).toBe(retention);
    });
  });
});

function reverse(data: any[]): any[] {
  const result = [];

  for (let i = data.length - 1; i >= 0; i--) {
    result.push(data[i]);
  }

  return result;
}

async function insertMany(client, key, start_ts, samples_count, data) {
  /*
  insert data to key, starting from start_ts, with 1 sec interval between them
  @param key: names of time_series
  @param start_ts: beginning of time series
  @param samples_count: number of samples
  @param data: could be a list of samples_count values, or one value. if a list, insert the values in their
  order, if not, insert the single value for all the timestamps
  */
  const pipeline = client.pipeline();
  for (let i = 0; i < samples_count; i++) {
    let value = Array.isArray(data) ? data[i] : data;
    const serialized =
      typeof value === 'object' ? JSON.stringify(value) : value;
    pipeline.timeseries(key, 'add', start_ts + i, serialized);
  }

  await pipeline.exec();
}

async function addValues(client, key, ...args) {
  const values = [].concat(...args);

  const pipeline = client.pipeline();
  for (let i = 0; i < values.length; i += 2) {
    const ts = values[i];
    const val = values[i + 1];
    pipeline.timeseries(key, 'add', ts, val);
  }

  await pipeline.exec();
}

export async function getRangeEx(client, cmd, key, min, max, ...args) {
  const response = await client.timeseries(key, cmd, min, max, ...args);
  return parseMessageResponse(response);
}

export async function getRange(client, key, min, max, ...args) {
  return getRangeEx(client, 'range', key, min, max, ...args);
}

export async function getRevRange(client, key, max, min, ...args) {
  return getRangeEx(client, 'revrange', key, max, min, ...args);
}

export async function copy(client, src, dest, min, max, ...args) {
  const sha = client.scriptsSet['timeseries'].sha;

  return client.evalsha(sha, 2, src, dest, 'copy', min, max, ...args);
}

export async function merge(client, src1, src2, dest, min, max, ...args) {
  const sha = client.scriptsSet['timeseries'].sha;

  return client.evalsha(sha, 3, src1, src2, dest, 'merge', min, max, ...args);
}
