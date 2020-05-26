import { removeAllQueueData } from '@src/server/models/queues';
import { QueueBus } from '@src/server/monitor/queues/queueBus';
import { RedisStreamAggregator } from '@src/server/redis/streamAggregator';
import { randomString, delay, createClient } from '../../utils';
import nanoid from 'nanoid';
import { Queue } from 'bullmq';

describe('QueueBus', () => {
  // jest.setTimeout(5000);
  const host = 'localhost';
  let queue;
  let client;
  let queueName;
  let bus;
  let aggregator;

  beforeEach(async function () {
    queueName = 'test-' + nanoid(10);
    client = await createClient();
    queue = new Queue(queueName, { connection: client });
    aggregator = new RedisStreamAggregator();
    await aggregator.connect();
    bus = new QueueBus(aggregator, queue, host);
  });

  afterEach(async function () {
    bus.destroy();
    await aggregator.destroy();
    await removeAllQueueData(client, queueName);
    await queue.close();
  });

  function postEvent(event, data = {}) {
    return bus.emit(event, data);
  }

  describe('emit', () => {
    jest.setTimeout(10000);

    it('should emit an event', async () => {
      let eventData;
      await bus.on('event.raised', (evt) => {
        eventData = evt;
      });

      const rid = randomString();
      await bus.emit('event.raised', {
        string: 'string',
        number: 1,
        rid,
      });
      await delay(1050);
      expect(eventData).not.toBeUndefined();
      expect(eventData.rid).toEqual(rid);
    });
  });
});
