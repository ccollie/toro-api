/*eslint-env node */
'use strict';
import { Job, Queue } from 'bullmq';
import { v4 } from 'uuid';
import { clearDb, createQueue } from '../../__tests__/factories';
import { Scripts } from '../';

describe('getState', function () {
  let queue: Queue;
  let queueName: string;

  beforeEach(async function () {
    queueName = 'test-' + v4();
    queue = await createQueue(queueName);
  });

  afterEach(async () => {
    const client = await queue.client;
    await clearDb(client);
    await queue.close();
  });

  async function getState(job: Job): Promise<string> {
    return Scripts.getJobState(queue, job.id);
  }

  describe('when redisVersion is less than 6.0.6', () => {
    it('should get job actual state', async () => {
      const job = await queue.add('job', { foo: 'bar' }, { delay: 1 });
      const delayedState = await getState(job);

      expect(delayedState).toEqual('delayed');

      await queue.pause();
      await job.promote();
      await queue.resume();
      const waitingState = await getState(job);

      expect(waitingState).toEqual('waiting');

      await job.moveToFailed(new Error('test error'), '0', true);
      const failedState = await job.getState();

      expect(failedState).toEqual('failed');

      await job.moveToCompleted('succeeded', '0', true);
      const completedState = await job.getState();

      expect(completedState).toEqual('completed');
    });
  });

});
