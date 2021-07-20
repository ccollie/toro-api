import { HostConfig } from '@src/types';
import { getUniqueId } from '@src/server/lib';
import { HostManager } from '@src/server/hosts';
import {
  clearDb,
  DEFAULT_CONNECTION_OPTIONS,
  TEST_QUEUE_PREFIX,
} from '../../factories';
import { nanoid } from 'nanoid';
import { FlowJob } from 'bullmq';
import { addJobSchema } from '@src/server/queues';

describe('HostManager', () => {
  beforeEach(async () => {
    process.env.HOST_URL_TEMPLATE = 'localhost:8000/hosts/{{host.id}}';
    await clearDb();
  });

  function createConfig(defaults?: Partial<HostConfig>): HostConfig {
    return {
      allowDynamicQueues: false,
      autoDiscoverQueues: false,
      connection: DEFAULT_CONNECTION_OPTIONS,
      prefix: TEST_QUEUE_PREFIX,
      queues: [],
      channels: [],
      id: getUniqueId(),
      name: 'host-' + getUniqueId(),
      ...(defaults || {}),
    };
  }

  describe('constructor', () => {
    it('can construct a HostManager', async () => {
      const config: HostConfig = {
        allowDynamicQueues: false,
        autoDiscoverQueues: false,
        connection: DEFAULT_CONNECTION_OPTIONS,
        queues: [],
        id: getUniqueId(),
        name: 'host-' + getUniqueId(),
        description: nanoid(),
      };

      const sut = new HostManager(config);
      try {
        expect(sut.config).toStrictEqual(config);
        expect(sut.name).toEqual(config.name);
        expect(sut.id).toBe(config.id);
        expect(sut.client).toBeDefined();
        expect(sut.writer).toBeDefined();
        expect(sut.lock).toBeDefined();
        expect(sut.notifications).toBeDefined();
        expect(sut.bus).toBeDefined();
        expect(sut.description).toBe(config.description);
        expect(sut.streamAggregator).toBe(sut.streamAggregator);
      } finally {
        await sut.destroy();
      }
    });

    it('adds configured queues', async () => {
      const config = createConfig({
        queues: [
          {
            name: 'bb_queue',
            prefix: 'bbq',
            jobTypes: [],
          },
          {
            name: 'suzy_queue',
          },
          {
            name: 'widgets',
          },
          {
            name: 'tacos',
          },
        ],
      });

      // normal
      const sut = new HostManager(config);
      try {
        await sut.waitUntilReady();
        expect(sut.queueManagers.length).toBe(config.queues.length);
        config.queues.forEach((queueConfig) => {
          const found = sut.queueManagers.find(
            (q) => q.name === queueConfig.name,
          );
          expect(found).toBeDefined();
        });
        const first = config.queues[0];
        const queue = sut.getQueue(first.prefix, first.name);
        expect(queue).toBeDefined();
      } finally {
        await sut.destroy();
      }
    });

    it('adds configured channels', async () => {});

    it('gets uri', async () => {
      const config: HostConfig = {
        allowDynamicQueues: false,
        autoDiscoverQueues: false,
        connection: DEFAULT_CONNECTION_OPTIONS,
        queues: [],
        id: getUniqueId(),
        name: 'host-' + getUniqueId(),
      };

      process.env = Object.assign(process.env, {
        HOST_URI_TEMPLATE: 'localhost/h/{{host.id}}',
      });

      const expected = `localhost/h/${config.id}`;

      const sut = new HostManager(config);
      try {
        expect(sut.uri).toBe(expected);
      } finally {
        await sut.destroy();
      }
    });

    describe('addFlow', () => {
      const parentQueue = `result-${nanoid()}`;
      const topQueueName = `result-${nanoid()}`;
      let sut: HostManager;

      const videoQueue = 'video-processing';

      const hostConfig = createConfig({
        queues: [
          {
            name: topQueueName,
          },
          {
            name: videoQueue,
          },
          {
            name: parentQueue,
          },
          {
            name: 'renovate',
          },
          {
            name: 'steps',
          },
        ],
      });

      beforeEach(async () => {
        sut = new HostManager(hostConfig);
        await sut.waitUntilReady();
      });

      afterEach(async () => {
        await sut.destroy();
      });

      it('adds a flow', async () => {
        const queueName = videoQueue;
        const name = 'child-job';

        const jobTree: FlowJob = {
          name: 'root-job',
          queueName: topQueueName,
          data: {},
          children: [
            {
              name,
              data: { idx: 0, foo: 'bar' },
              queueName,
              children: [
                {
                  name,
                  data: { idx: 1, foo: 'baz' },
                  queueName,
                  children: [{ name, data: { idx: 2, foo: 'qux' }, queueName }],
                },
              ],
            },
            {
              name,
              data: { idx: 3, foo: 'bax' },
              queueName,
            },
            {
              name,
              data: { idx: 4, foo: 'baz' },
              queueName,
            },
          ],
        };

        const originalTree = await sut.addFlow(jobTree);

        const { job: topJob } = originalTree;

        const tree = await sut.getFlow({
          id: topJob.id,
          queueName: parentQueue,
          depth: 2,
          maxChildren: 2,
        });

        expect(tree.job).toBeDefined();
        expect(tree.children).toBeDefined();

        const { children, job } = tree;
        const isWaitingChildren = await job.isWaitingChildren();

        expect(isWaitingChildren).toBeTruthy();
        expect(children.length).toBeGreaterThanOrEqual(2);

        expect(children[0].job.id).toBeDefined();
        expect(children[0].children).toBeUndefined();

        expect(children[1].job.id).toBeDefined();
        expect(children[1].children).toBeUndefined();
      });

      it('only allows adding to queues it manages', async () => {
        const queueName = videoQueue;
        const name = 'compare';

        const expected = `Could not find queue "invalid_queue" in host "${sut.name}"`;

        expect(
          sut.addFlow({
            name: 'parent-job',
            queueName,
            data: {},
            opts: {
              removeOnComplete: true,
            },
            children: [
              { name, data: { idx: 0, foo: 'bar' }, queueName },
              {
                name,
                data: { idx: 1, foo: 'baz' },
                queueName: 'invalid_queue',
              },
              { name, data: { idx: 2, foo: 'qux' }, queueName },
            ],
          }),
        ).rejects.toMatchObject({
          message: expected,
        });
      });

      it('validates jobs by schema before adding', async () => {
        const queueName = 'steps';

        const schema = {
          type: 'object',
          properties: {
            place: { type: 'string' },
            room: { type: 'string', enum: ['kitchen', 'bathroom', 'bedroom'] },
          },
          additionalProperties: false,
          required: ['place', 'room'],
        };

        const queue = sut.getQueue(queueName);

        await addJobSchema(queue, 'paint', schema);

        const flowTree: FlowJob = {
          name: 'renovate-interior',
          queueName: 'renovate',
          children: [
            {
              name: 'paint',
              data: { place: 'ceiling', room: 'kitchen' },
              queueName,
            },
            {
              name: 'paint',
              data: { place: 'walls', room: 'invalid' },
              queueName,
            },
            {
              name: 'fix',
              data: { place: 'floor', room: 'bathroom' },
              queueName,
            },
          ],
        };

        expect(sut.addFlow(flowTree)).rejects.toMatchObject({
          data: null,
          isServer: false,
          output: {
            headers: {},
            payload: {
              error: 'Bad Request',
              message:
                // eslint-disable-next-line max-len
                '"room" property must be equal to one of the allowed values: "kitchen", "bathroom", "bedroom"',
              statusCode: 400,
            },
            statusCode: 400,
          },
        });
      });
    });
  });
});
