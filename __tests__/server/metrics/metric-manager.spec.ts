import {
  clearDb,
  createHostManager,
  QueueListenerHelper,
} from '../../factories';
import { HostManager } from '../../../src/server/hosts';
import { QueueListener, QueueManager } from '../../../src/server/queues';
import { delay, randomString } from '../utils';
import {
  AggregatorTypes,
  MetricsEventsEnum,
  MetricTypes,
  QueueConfig,
  SerializedMetric,
} from '../../../src/types';
import { MetricManager } from '../../../src/server/metrics/metric-manager';
import {
  BaseMetric,
  InstantaneousOpsMetric,
  LatencyMetric,
  P90Aggregator,
} from '../../../src/server/metrics';
import IORedis from 'ioredis';
import ms from 'ms';

describe('MetricManager', () => {
  let listenerHelper: QueueListenerHelper;
  let queueListener: QueueListener;
  let hostManager: HostManager;
  let queueManager: QueueManager;
  let client: IORedis.Redis;

  beforeEach(async function () {
    const queueName = 'test-' + randomString(5);
    const queueConfig: QueueConfig = {
      name: queueName,
      prefix: 'bull',
    };

    hostManager = createHostManager({
      queues: [queueConfig],
    });
    await hostManager.waitUntilReady();

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
      const sut = new MetricManager(
        queueManager.queueListener,
        queueManager.bus,
      );
      expect(sut).toBeDefined();
    });
  });

  describe('start', () => {
    it('load all metrics', async () => {});
  });

  describe('createMetric', () => {
    let client: IORedis.Redis;

    beforeEach(async () => {
      client = await queueManager.queue.client;
    });

    it('creates a metric from JSON', async () => {
      const json: SerializedMetric = {
        aggregator: {
          type: AggregatorTypes.Null,
          options: {},
        },
        id: '',
        name: 'name-' + randomString(5),
        description: 'description-' + randomString(5),
        options: {},
        type: MetricTypes.Latency,
      };

      const sut = new MetricManager(queueListener, queueManager.bus);
      const metric = await sut.createMetric(json);

      expect(metric).toBeDefined();
      expect(metric).toBeInstanceOf(LatencyMetric);

      const members = await client.smembers(sut.indexKey);
      expect(members.includes(metric.id)).toBe(true);

      const data = await client.hgetall(sut.getMetricKey(metric));
      expect(data).toBeDefined();
      expect(data.id).toBe(metric.id);
      expect(data.isActive).toBe('false');
      expect(data.type).toBe('latency');
      expect(data.createdAt).toBe(metric.createdAt.toString());
      expect(data.updatedAt).toBe(metric.updatedAt.toString());

      expect(sut.metrics.length).toBe(1);
    });

    it('emits an "added" event', async (done) => {
      const json: SerializedMetric = {
        aggregator: {
          type: AggregatorTypes.Null,
          options: {},
        },
        id: '',
        options: {},
        name: 'name-' + randomString(5),
        description: 'description-' + randomString(5),
        type: MetricTypes.Latency,
      };

      let eventData: Record<string, any> = null;
      queueManager.bus.on(MetricsEventsEnum.METRIC_ADDED, (data) => {
        eventData = data;
        done();
      });
      const sut = new MetricManager(queueListener, queueManager.bus);
      const metric = await sut.createMetric(json);
    });
  });

  const INTERVAL = ms('10 sec');
  const DURATION = ms('2 min');

  function createMetric(): BaseMetric {
    const metric = new InstantaneousOpsMetric({
      interval: INTERVAL,
      jobNames: [],
      name: `name-${randomString(4)}`,
    });

    metric.aggregator = new P90Aggregator(queueManager.clock, {
      duration: DURATION,
    });

    return metric;
  }

  describe('saveMetric', () => {
    describe('new metric', () => {
      it('saves to redis', async () => {
        const now = queueManager.clock.getTime();

        const metric = createMetric();

        const sut = new MetricManager(queueListener, queueManager.bus);
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

      it('emits an "added" event', async (done) => {
        const metric = createMetric();

        let eventData: Record<string, any> = null;
        queueManager.bus.on(MetricsEventsEnum.METRIC_ADDED, (data) => {
          eventData = data;
          done();
        });

        const sut = new MetricManager(queueListener, queueManager.bus);
        await sut.saveMetric(metric);
      });
    });

    describe('existing metric', () => {
      it('saves to redis', async () => {
        const metric = createMetric();

        const sut = new MetricManager(queueListener, queueManager.bus);
        const saved = await sut.saveMetric(metric);

        expect(saved.isActive).toBe(true);

        saved.isActive = false;
        saved.name = 'changed_name';

        await sut.saveMetric(saved);

        const data = await client.hgetall(sut.getMetricKey(metric));
        expect(data).toBeDefined();
        expect(data.id).toBe(metric.id);
        expect(data.isActive).toBe('false');
        expect(data.name).toBe('changed_name');

        const lastUpdated = parseInt(data.updatedAt);
        expect(saved.updatedAt).toBe(lastUpdated);
      });

      it('emits an "updated" event', async (done) => {
        const metric = createMetric();

        let eventData: Record<string, any> = null;
        queueManager.bus.on(MetricsEventsEnum.METRIC_UPDATED, (data) => {
          eventData = data;
          done();
        });

        const sut = new MetricManager(queueListener, queueManager.bus);
        const saved = await sut.saveMetric(metric);

        saved.isActive = false;
        saved.name = 'changed_name';

        await sut.saveMetric(saved);
      });

      it('emits events on active state change', async () => {
        const metric = createMetric();
        metric.isActive = false;

        let eventData: Record<string, any> = null;
        queueManager.bus.on(MetricsEventsEnum.METRIC_ACTIVATED, (data) => {
          expect(data?.['metricId']).toBeDefined();
          eventData = data;
        });

        queueManager.bus.on(MetricsEventsEnum.METRIC_DEACTIVATED, (data) => {
          expect(data?.['metricId']).toBeDefined();
          eventData = data;
        });

        const sut = new MetricManager(queueListener, queueManager.bus);
        const saved = await sut.saveMetric(metric);

        saved.isActive = true;
        await sut.saveMetric(saved);
        await delay(800);
        expect(eventData).not.toBe(null);
        eventData = null;

        saved.isActive = false;
        await sut.saveMetric(saved);
        await delay(800);
        expect(eventData).not.toBe(null);
      });
    });
  });

  describe('deleteMetric', () => {
    async function addMetric(sut: MetricManager): Promise<BaseMetric> {
      const metric = createMetric();
      return sut.saveMetric(metric);
    }

    it('should remove the metric', async () => {
      const sut = new MetricManager(queueListener, queueManager.bus);
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

      const sut = new MetricManager(queueListener, queueManager.bus);
      const metric = await addMetric(sut);
      await sut.deleteMetric(metric);
    });

    // TODO: it clears metric data
  });
});
