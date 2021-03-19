import { HostManager } from '../../../src/server/hosts';
import { QueueManager } from '../../../src/server/queues';
import { createQueue } from '../factories';
import { QueueConfig } from '../../../src/types';
import { clearDb } from '../utils';
import { createHostManager } from '../../fixtures/host-manager';
import { nanoid } from 'nanoid';

describe('QueueManager', () => {
  let hostManager: HostManager;

  beforeEach(async () => {
    hostManager = createHostManager();
    await hostManager.waitUntilReady();
  });

  afterEach(async () => {
    await clearDb(hostManager.client);
    await hostManager.destroy();
  });

  describe('constructor', () => {
    it('constructs an instance', async () => {
      const queue = createQueue(null, {
        connection: hostManager.client,
      });
      const config: QueueConfig = {
        id: nanoid(),
        name: queue.name,
        prefix: queue.opts.prefix,
      };
      const sut = new QueueManager(hostManager, queue, config);
      try {
        expect(sut).toBeDefined();
        expect(sut.queue).toBe(queue);
        expect(sut.hostManager).toBe(hostManager);
        expect(sut.config).toStrictEqual(config);
        expect(sut.bus).toBeDefined();
        expect(sut.queueListener).toBeDefined();
        expect(sut.ruleManager).toBeDefined();
        expect(sut.statsClient).toBeDefined();
        expect(sut.id).toBe(config.id);
        expect(sut.name).toBe(queue.name);
        expect(sut.hostName).toBe(hostManager.name);
        expect(sut.prefix).toBe(queue.opts.prefix);
      } finally {
        await sut.destroy();
      }
    });

    it('gets uri', async () => {
      process.env.QUEUE_URI_TEMPLATE = 'localhost/q/{{queue.id}}';
      const config: QueueConfig = {
        id: nanoid(),
        name: 'q-' + nanoid(),
      };
      const expected = `localhost/q/${config.id}`;

      const queue = createQueue(null, {
        connection: hostManager.client,
      });
      const sut = new QueueManager(hostManager, queue, config);

      try {
        expect(sut.uri).toBe(expected);
      } finally {
        await sut.destroy();
      }
    });
  });

  // todo: uri
});
