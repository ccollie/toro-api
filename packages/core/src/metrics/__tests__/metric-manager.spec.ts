import {
  clearDb,
  createHostManager,
  QueueListenerHelper,
} from '../../__tests__/factories';
import { HostManager, QueueConfig } from '../../hosts';
import { QueueListener, QueueManager } from '../../queues';
import { Metric, MetricManager } from '../';
import { MetricsEventsEnum } from '../types';
import { delay, getUniqueId } from '../../lib';
import { RedisClient } from 'bullmq';
import {
  NoTags,
  Gauge as GaugeName
} from '../metric-name';

describe('MetricManager', () => {
  let listenerHelper: QueueListenerHelper;
  let queueListener: QueueListener;
  let hostManager: HostManager;
  let queueManager: QueueManager;
  let client: RedisClient;

  beforeEach(async function () {
    const queueName = 'test-' + getUniqueId();
    const queueConfig: QueueConfig = {
      name: queueName,
      prefix: 'bull',
    };

    hostManager = await createHostManager({
      queues: [queueConfig],
    });

    queueManager = hostManager.getQueueManager(queueName);
    queueListener = queueManager.queueListener;
    listenerHelper = new QueueListenerHelper(queueManager.queueListener);
    client = await hostManager.client;
  });

  afterEach(async function () {
    await clearDb(hostManager.client);
    await Promise.all([queueManager.destroy(), hostManager.destroy()]);
  });

  describe('constructor', () => {
    it('should construct an object', () => {
      const sut = new MetricManager({
        queue: queueManager.queue,
        host: 'host',
        bus: queueManager.bus,
        client: client
      });
      expect(sut).toBeDefined();
    });
  });

  describe('start', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    it('loads all metrics', async () => {});
  });

  describe('createMetric', () => {
    let client: RedisClient;

    beforeEach(async () => {
      client = await queueManager.queue.client;
    });

    it('creates a metric from JSON', async () => {
      const sut = new MetricManager({
        queue: queueManager.queue,
        host: 'host',
        bus: queueManager.bus,
        client
      });
      const metric = await sut.createMetric('jobs_waiting');

      expect(metric).toBeDefined();
      expect(metric.name.name).toBeInstanceOf('jobs_waiting');

      const exists = await client.hexists(sut.indexKey, metric.canonicalName);
      expect(exists).toBe(true);

      const data = await client.hgetall(sut.getMetricKey(metric));
      expect(data).toBeDefined();
      expect(sut.metrics.length).toBe(1);
    });

    it('emits an "added" event', async () => {
      let eventData: Record<string, any> = null;
      queueManager.bus.on(MetricsEventsEnum.METRIC_ADDED, (data) => {
        eventData = data;
      });
      const sut = new MetricManager({
        queue: queueManager.queue,
        host: 'host',
        bus: queueManager.bus,
        client
      });

      const metric = await sut.createMetric('jobs_waiting');
      await delay(200);
      const canonicalName = metric.canonicalName;

      expect(eventData).toMatchObject({ canonicalName });
    });
  });

  function createMetric(): Metric {
    const mn = new GaugeName( 'jobs_active', NoTags, NoTags);
    const metric = new Metric(mn);
    return metric;
  }

  function createManager(): MetricManager {
    return new MetricManager({
      queue: queueManager.queue,
      host: 'host',
      bus: queueManager.bus,
      client
    });
  }

  describe('saveMetric', () => {
    describe('new metric', () => {
      it('saves to redis', async () => {
        const now = queueManager.clock.getTime();

        const metric = createMetric();

        const sut = createManager();
        const saved = await sut.saveMetric(metric);

        const members = await client.smembers(sut.indexKey);
        expect(members.includes(metric.id)).toBe(true);

        const data = await client.hgetall(sut.getMetricKey(metric));
        expect(data).toBeDefined();
        expect(data.type).toBe('instantaneous_ops_per_sec');
        expect(data.createdAt).toBe(now.toString());
        expect(data.updatedAt).toBe(now.toString());

        expect(sut.metrics.length).toBe(1);
      });

      it('emits an "added" event', async () => {
        const metric = createMetric();

        let eventData: Record<string, any> = null;
        queueManager.bus.on(MetricsEventsEnum.METRIC_ADDED, (data) => {
          eventData = data;
        });

        const sut = createManager();
        await sut.saveMetric(metric);

        await delay(150);
        expect(eventData).not.toBeNull();
      });
    });

    describe('existing metric', () => {
      it('saves to redis', async () => {
        const metric = createMetric();

        const sut = createManager();
        const saved = await sut.saveMetric(metric);

        const data = await client.hgetall(sut.getMetricKey(metric));
        expect(data).toBeDefined();
        expect(data.name).toBe('changed_name');
      });

      it('emits an "updated" event', async (done) => {
        const metric = createMetric();

        let eventData: Record<string, any> = null;
        queueManager.bus.on(MetricsEventsEnum.METRIC_UPDATED, (data) => {
          eventData = data;
          done();
        });

        const sut = createManager();
        const saved = await sut.saveMetric(metric);

        await sut.saveMetric(saved);
      });

      it('emits events on active state change', async () => {
        const metric = createMetric();

        let eventData: Record<string, any> = null;
        queueManager.bus.on(MetricsEventsEnum.METRIC_ACTIVATED, (data) => {
          expect(data?.['metricId']).toBeDefined();
          eventData = data;
        });

        queueManager.bus.on(MetricsEventsEnum.METRIC_DEACTIVATED, (data) => {
          expect(data?.['metricId']).toBeDefined();
          eventData = data;
        });

        const sut = createManager();
        const saved = await sut.saveMetric(metric);

        await sut.saveMetric(saved);
        await delay(800);
        expect(eventData).not.toBe(null);
        eventData = null;

        await sut.saveMetric(saved);
        await delay(800);
        expect(eventData).not.toBe(null);
      });
    });
  });

  describe('deleteMetric', () => {
    async function addMetric(sut: MetricManager): Promise<Metric> {
      const metric = createMetric();
      return sut.saveMetric(metric);
    }

    it('should remove the metric', async () => {
      const sut = createManager();
      const metric = await addMetric(sut);
      const deleted = await sut.deleteMetric(metric);

      expect(deleted).toBe(true);

      const exists = await client.exists(sut.getMetricKey(metric));
      expect(exists).toBeFalsy();

      const members = await client.smembers(sut.indexKey);
      expect(members.includes(metric.id)).toBe(false);

      expect(sut.metrics.length).toBe(0);
    });

    it('emits a "deleted" event', async (done) => {
      let eventData: Record<string, any> = null;
      queueManager.bus.on(MetricsEventsEnum.METRIC_DELETED, (data) => {
        eventData = data;
        done();
      });

      const sut = createManager();
      const metric = await addMetric(sut);
      await sut.deleteMetric(metric);
    });

    // TODO: it clears metric data
  });
});
