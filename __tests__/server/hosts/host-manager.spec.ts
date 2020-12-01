import { HostConfig } from '../../../src/types';
import { getUniqueId } from '../../../src/server/lib';
import { HostManager } from '../../../src/server/hosts';
import { clearDb, DEFAULT_CLIENT_OPTIONS } from '../utils';
import nanoid from 'nanoid';

describe('HostManager', () => {

  beforeEach(async () => {
    process.env.HOST_URL_TEMPLATE = 'localhost:8000/hosts/{{host.id}}';
    await clearDb()
  });

  function createConfig(defaults?: Partial<HostConfig>): HostConfig {
    return {
      allowDynamicQueues: false,
      autoDiscoverQueues: false,
      connection: DEFAULT_CLIENT_OPTIONS,
      queues: [],
      channels: [],
      id: getUniqueId(),
      name: 'host-' + getUniqueId(),
      ...(defaults || {})
    };
  }

  describe('constructor', () => {
    it('can construct a HostManager', async () => {
      const config: HostConfig = {
        allowDynamicQueues: false,
        autoDiscoverQueues: false,
        connection: DEFAULT_CLIENT_OPTIONS,
        queues: [],
        id: getUniqueId(),
        name: 'host-' + getUniqueId(),
        description: nanoid()
      }

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
        queues:[
          {
            "name": "bb_queue",
            "prefix": "bbq",
            "jobTypes": []
          },
          {
            "name": "suzy_queue"
          },
          {
            "name": "widgets"
          },
          {
            "name": "tacos"
          },
        ]
      });

      // normall
      const sut = new HostManager(config);
      try {
        await sut.waitUntilReady();
        expect(sut.queueManagers.length).toBe(config.queues.length);
        config.queues.forEach((queueConfig) => {
          const found = sut.queueManagers.find((q) => q.name === queueConfig.name);
          expect(found).toBeDefined();
        });
        const first = config.queues[0];
        const queue = sut.getQueue(first.prefix, first.name);
        expect(queue).toBeDefined();
      } finally {
        await sut.destroy();
      }
    })

    it('adds configured channels', async () => {
    })

    it('gets uri', async () => {
      const config: HostConfig = {
        allowDynamicQueues: false,
        autoDiscoverQueues: false,
        connection: DEFAULT_CLIENT_OPTIONS,
        queues: [],
        id: getUniqueId(),
        name: 'host-' + getUniqueId(),
      }

      process.env = Object.assign(process.env, {
        HOST_URI_TEMPLATE: 'localhost/h/{{host.id}}'
      });

      const expected = `localhost/h/${config.id}`;

      const sut = new HostManager(config);
      try {
        expect(sut.uri).toBe(expected);
      } finally {
        await sut.destroy();
      }
    })

  })
});
