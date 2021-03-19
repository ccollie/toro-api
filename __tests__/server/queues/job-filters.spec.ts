import pMap from 'p-map';
import { clearDb, createClient } from '../utils';
import { nanoid } from 'nanoid';
import { Queue } from 'bullmq';
import {
  addJobFilter,
  deleteAllJobFilters,
  deleteJobFilter,
  getJobFilter,
  getJobFilters,
} from '../../../src/server/queues';
import { getJobFiltersKey } from '../../../src/server/lib';
import { JobFilter, JobStatusEnum } from '../../../src/types';
import sortBy from 'lodash/sortBy';
import sampleSize from 'lodash/sampleSize';

describe('Job Filters', function () {
  let queue, queueName, client;

  beforeEach(async function () {
    queueName = 'test-' + nanoid(5);
    client = await createClient();
    queue = new Queue(queueName, { connection: client });
  });

  afterEach(async function () {
    await clearDb(client);
    await queue.close();
  });

  function getKey(): string {
    return getJobFiltersKey(queue);
  }

  function getHashValue(name: string): string {
    const key = getKey();
    return client.hget(key, name);
  }

  const SAMPLE_EXPR = 'job.returnvalue == null';

  async function createFilter(expr?: string): Promise<JobFilter> {
    expr = expr || SAMPLE_EXPR;
    return addJobFilter(queue, 'Simple', JobStatusEnum.COMPLETED, expr);
  }

  describe('addJobFilter', function () {
    it('it can create a job filter', async () => {
      const now = Date.now();
      const saved = await addJobFilter(
        queue,
        'test',
        JobStatusEnum.FAILED,
        SAMPLE_EXPR,
      );
      expect(saved).toBeDefined();
      expect(saved.name).toBe('test');
      expect(saved.expression).toEqual(SAMPLE_EXPR);
      expect(saved.status).toEqual(JobStatusEnum.FAILED);
      expect(saved.createdAt).toBeGreaterThanOrEqual(now);

      const data = await getHashValue(saved.id);
      expect(data).toBeDefined();
    });

    it('it can create a filter without a job status', async () => {
      const saved = await addJobFilter(queue, 'test', null, SAMPLE_EXPR);
      expect(saved).toBeDefined();
      expect(saved.status).toEqual(null);
    });

    it('It validates the filter before saving', async () => {
      await expect(
        addJobFilter(
          queue,
          'test',
          JobStatusEnum.COMPLETED,
          'job.missing > (50',
        ),
      ).rejects.toThrow();
    });
  });

  describe('getJobFilter', () => {
    it('it can retrieve stored filters', async () => {
      const expr = 'job.returnvalue != null';
      const saved = await addJobFilter(
        queue,
        'Simple',
        JobStatusEnum.COMPLETED,
        expr,
      );
      const retrieved = await getJobFilter(queue, saved.id);

      expect(retrieved).toBeDefined();
      expect(saved.id).toEqual(retrieved.id);
      expect(saved.status).toEqual(retrieved.status);
      expect(saved.expression).toEqual(retrieved.expression);
      expect(saved.createdAt).toEqual(retrieved.createdAt);
    });

    it('it returns null on non-existent filter', async () => {
      const nonExistent = nanoid(10);
      const retrieved = await getJobFilter(queue, nonExistent);

      expect(retrieved).toBeNull();
    });
  });

  describe('getJobFilters', () => {
    const FilterNames = ['lorem', 'ipsum', 'dolor', 'sit', 'amet'];
    let filters: JobFilter[];

    async function createFilters() {
      filters = await pMap(FilterNames, (name) =>
        addJobFilter(queue, name, JobStatusEnum.COMPLETED, SAMPLE_EXPR),
      );
      filters = sortBy(filters, 'id');
    }

    it('it can get multiple filters at once', async () => {
      await createFilters();
      const keys = await client.hkeys(getKey());
      const subset = sampleSize(keys, 3);
      const actual = sortBy(await getJobFilters(queue, subset), 'id');
      const expected = sortBy(
        filters.filter((x) => subset.includes(x.id)),
        'id',
      );
      expect(actual).toEqual(expected);
    });

    it('it gets all filters if no ids are specified', async () => {
      await createFilters();
      let actual = sortBy(await getJobFilters(queue), 'id');
      expect(actual).toStrictEqual(filters);
    });
  });

  describe('deleteJobFilter', () => {
    it('it can delete an existing filter', async () => {
      const saved = await createFilter();
      expect(saved).toBeDefined();
      const deleted = await deleteJobFilter(queue, saved.id);
      expect(deleted).toBe(true);
      const data = await getHashValue('test');
      expect(data).toBeNull();
    });

    it('it returns false for an non-existent filter', async () => {
      const nonExistent = nanoid(10);
      const deleted = await deleteJobFilter(queue, nonExistent);
      expect(deleted).toBe(false);
    });
  });

  describe('deleteAllFilters', () => {
    it('it should delete all filters for a queue', async () => {
      const names = ['lorem', 'ipsum', 'dolor', 'sit', 'amet'];
      await pMap(names, (name) =>
        addJobFilter(queue, name, JobStatusEnum.FAILED, SAMPLE_EXPR),
      );
      // ensure we've stored our values
      const items = await client.hkeys(getKey());
      expect(items.length).toBe(names.length);

      const deleteCount = await deleteAllJobFilters(queue);
      expect(deleteCount).toBe(names.length);
    });
  });
});
