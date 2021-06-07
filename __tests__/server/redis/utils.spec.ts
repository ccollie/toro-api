import { groupBy, sample } from 'lodash';
import { createClient } from '../../factories';
import { deleteAllQueueData, discoverQueues } from '@src/server/queues';
import { Queue } from 'bullmq';
import pMap from 'p-map';

describe('utils', () => {
  describe('discoverQueues', () => {
    let queues: any[], client;

    beforeEach(function () {
      queues = [];
      client = createClient();
    });

    afterEach(async function () {
      if (Array.isArray(queues) && queues.length) {
        await pMap(queues, deleteAllQueueData);
        // await pMap(queues, queue => queue.close());
      }
      await client.disconnect();
    });

    const QueueNames = [
      'lorem',
      'ipsum',
      'dolor',
      'sit',
      'amet',
      'consectetur',
    ];
    const Prefixes = ['bully', 'toroidal', 'vachery'];

    async function createQueues() {
      const result = new Map<string, Queue[]>();
      Prefixes.forEach((prefix) => {
        result.set(prefix, []);
      });
      const init = [];
      queues = queues || [];
      QueueNames.forEach((name) => {
        const prefix = sample(Prefixes);
        const queue = new Queue(name, { connection: client, prefix });
        const queueList = result.get(prefix);
        queueList.push(queue);
        queues.push(queue);
        init.push(queue.waitUntilReady());
      });
      await Promise.all(init);
      return result;
    }

    it('it can discover all queues', async () => {
      const queues = await createQueues();
      let expectedCount = 0;
      let prefixes = [];
      const names = Object.create(null);
      for (let [prefix, list] of queues) {
        expectedCount += list.length;
        prefixes.push(prefix);
        names[prefix] = list.map((x) => x.name).sort();
      }
      prefixes = prefixes.sort();

      const discovered = await discoverQueues(client);
      expect(discovered).toBeDefined();
      expect(Array.isArray(discovered)).toBe(true);
      expect(discovered.length).toBe(expectedCount);

      const byPrefix = groupBy(discovered, (item) => item.prefix);
      const discoveredPrefixes = Object.keys(byPrefix).sort();

      expect(discoveredPrefixes).toBe(prefixes);

      discoveredPrefixes.forEach((prefix) => {
        const discovered = byPrefix[prefix];
        const created = names[prefix];
        expect(discovered).toEqual(created);
      });
    });

    it('it can discover queues by prefix', async () => {
      const queues = await createQueues();
      const prefixes = Array.from(queues.keys());
      const prefix = prefixes.find((x) => queues.get(x).length);
      const expectedCount = queues.get(prefix).length;

      const discovered = await discoverQueues(client, prefix);
      expect(discovered).toBeDefined();
      expect(Array.isArray(discovered)).toBe(true);
      expect(discovered.length).toBe(expectedCount);

      discovered.forEach((data) => {
        expect(data.prefix).toBe(prefix);
      });
    });
  });
});
