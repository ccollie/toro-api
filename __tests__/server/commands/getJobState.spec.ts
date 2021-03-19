/*eslint-env node */
'use strict';
import { Job, Queue } from 'bullmq';
import { v4 } from 'uuid';
import { clearDb, createQueue } from '../utils';
import { Scripts } from '@src/server/commands/scripts';

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

  // TODO:
  // Divide into several tests
  //
  /*
    const scripts = require('../lib/scripts');
    it('get job status', function() {
      this.timeout(12000);

      const client = new redis();
      return Job.create(queue, { foo: 'baz' })
        .then(job => {
          return job
            .isStuck()
            .then(isStuck => {
              expect(isStuck).toEqual(false);
              const state = await getState(job);
              expect(state).toEqual('waiting');
              return scripts.moveToActive(queue).then(() => {
                return job.moveToCompleted();
              });
            })
              const isCompleted = await job.isCompleted();
            expect(isCompleted).toEqual(true);
            const state = await getState(job);
            expect(state).toEqual('completed');
              await client.zrem(queue.toKey('completed'), job.id);
              await job.moveToDelayed(Date.now() + 10000, true);
              const yes = await job.isDelayed();
              expect(yes).toEqual(true);
              const state = await getState(job);
              expect(state).toEqual('delayed');
              await client.zrem(queue.toKey('delayed'), job.id);
              await job.moveToFailed(new Error('test'), true);
              const isFailed = await job.isFailed();
              expect(isFailed).toEqual(true);
              const state = await getState(job);
              expect(state).toEqual('failed');
              const res = await client.zrem(queue.toKey('failed'), job.id);
              expect(res).toEqual(1);
              stata = await getState(job);
              expect(state).toEqual('stuck');
              await client.rpop(queue.toKey('wait'));
              return client.lpush(queue.toKey('paused'), job.id);
              const isPaused = await job.isPaused();
              expect(isPaused).toEqual(true);
              state = await getState(job);
              expect(state).toEqual('paused');
              await client.rpop(queue.toKey('paused'));
              await client.lpush(queue.toKey('wait'), job.id);
              const isWaiting = await job.isWaiting();
              expect(isWaiting).toEqual(true);
              state = await getState(job);
              expect(state).toEqual('waiting');
      
        })
        .then(() => {
          return client.quit();
        });
    });
    */
});
