import { safeParse } from '@alpen/shared';
import { Queue } from 'bullmq';
import { nanoid } from 'nanoid';
import { JobStatusEnum } from '../../../types';
import { Command, createQueue, loadIncludeScript, } from '../utils';


function createTestScript(include: string): string {
  return `
    ${include}

    local key = KEYS[1]
    local cursor = ARGV[1]
    local limit = tonumber(ARGV[2])

    local ids, nextCursor, total = scanJobIds(key, cursor, limit)
    local result = {
      ids = ids,
      cursor = nextCursor,
      total = total,
    }
    return cjson.encode(result)
  `;
}

function isZset(status: JobStatusEnum): boolean {
  return (
    status === JobStatusEnum.COMPLETED ||
    status === JobStatusEnum.FAILED ||
    status === JobStatusEnum.DELAYED
  );
}

export function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

describe('scanJobIds.lua', () => {
  let client;
  let command: Command;
  let queue: Queue;

  beforeAll(async () => {
    const script = await loadIncludeScript('scanJobIds.lua');
    const lua = createTestScript(script);

    command = {
      name: 'scanIds',
      options: {numberOfKeys: 1, lua},
    };
  });

  beforeEach(async () => {
    queue = await createQueue('scanJobIds-' + rand(20, 500000));
    client = await queue.client;
    client.defineCommand(command.name, command.options);
  });

  afterEach(async () => {
    // await clearQueueData(queue);
    queue.close();
  });

  type GetIdsReturnType = {
    ids: string[];
    cursor: number;
    total: number;
  };

  async function getIds(
    key: string,
    cursor = 0,
    count = 10,
  ): Promise<GetIdsReturnType> {
    const reply = await client.scanIds(key, cursor, count);
    const res = safeParse(reply);
    if (!Array.isArray(res.ids)) res.ids = [];
    if (!res.cursor) {
      res.cursor = 0;
    } else {
      res.cursor = parseInt(res.cursor, 10);
    }
    return res;
  }

  async function generateIds(
    status: JobStatusEnum,
    count = 10,
  ): Promise<{ key: string; ids: string[] }> {
    const ids = [];
    const added = new Set<number>();
    while (ids.length < count) {
      const id = rand(10, 100000);
      if (!added.has(id)) {
        ids.push('' + id);
        added.add(id);
      }
    }
    const key = queue.toKey(status);
    if (isZset(status)) {
      const args = [];
      for (let i = 0; i < ids.length; i++) {
        args.push(i); // score
        args.push(ids[i]); // id
      }
      await client.zadd(key, ...args);
    } else {
      await client.rpush(key, ...ids);
    }
    return {key, ids};
  }

  async function getIdsByType(
    type: JobStatusEnum,
    cursor = 0,
    count = 10,
  ): Promise<GetIdsReturnType> {
    const key = queue.toKey(type);
    return getIds(key, cursor, count);
  }

  describe('zset', () => {

    test('can get ids in a single iteration', async () => {
      const { ids } = await generateIds(JobStatusEnum.COMPLETED, 10);
      const res = await getIdsByType(JobStatusEnum.COMPLETED, 0, 20);
      expect(res.ids).toStrictEqual(ids);
      expect(res.cursor).toBe(0);
    });

    test('can get ids over multiple scans', async () => {
      const actual: string[] = [];
      // items set this high so that redis doesn't use optimized storage
      // https://redis.io/commands/scan#the-count-option
      const { ids } = await generateIds(JobStatusEnum.COMPLETED, 500);
      let cursor = 0;
      do {
        const res = await getIdsByType(JobStatusEnum.COMPLETED, cursor, 50);
        actual.push(...res.ids);
        cursor = res.cursor;
      } while (cursor !== 0);

      actual.sort();
      ids.sort();
      expect(actual).toStrictEqual(ids);
      expect(cursor).toBe(0);
    });
  });

  describe('list', () => {

    async function addJobs(count = 10): Promise<string[]> {
      const jobData = [];
      for(let i = 0; i < count; i++) {
        const job = {
          name: 'name-' + rand(10, 1000),
          data: {someString: nanoid()}
        };
        jobData.push(job);
      }
      const saved = await queue.addBulk(jobData);
      return saved.map(x => x.id);
    }

    async function addSpecialKeys(): Promise<void> {
      const keys = Object.keys(queue.keys)
        .filter(x => x.length > 0 && x !== 'wait');
      const specialKeys = keys.map(x => queue.toKey(x));
      // For the test, it doesn't matter what type of key we add,
      // it will be ignored
      const pipeline = client.pipeline();
      specialKeys.forEach(x => pipeline.set(x, 'some value'));
      await pipeline.exec();
    }


    test('can get ids in a single iteration', async () => {
      const { ids } = await generateIds(JobStatusEnum.DELAYED, 10);
      const res = await getIdsByType(JobStatusEnum.DELAYED, 0, 20);
      expect(res.ids).toStrictEqual(ids);
      expect(res.cursor).toBe(0);
    });

    test('filters properly using a full scan', async () => {
      const expected = await addJobs(20);
      await addSpecialKeys();
      const actual :string[] = [];
      const key = queue.toKey('wait');
      let cursor = 0;
      do {
        const res = await getIds(key, cursor, 10);
        actual.push(...res.ids);
        cursor = res.cursor;
      } while (cursor !== 0);
      expected.sort();
      actual.sort();
      expect(actual).toStrictEqual(expected);
    });
  });

});
