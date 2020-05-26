import { debounce, diff } from '../../../../../lib';
import { getQueueManager } from '../../helpers';
import { createResolver } from '../../../subscription';
import { GraphQLFieldResolver } from 'graphql';
import { isEmpty } from 'lodash';

export function jobUpdated(): GraphQLFieldResolver<any, any> {
  let unsub;

  const DELAY = 150; // todo: read from config

  async function cleanup(): Promise<void> {
    if (unsub) {
      await unsub();
      unsub = null;
    }
  }

  function getChannelName(_, { queueId, jobId }): string {
    return `JOB_UPDATED_${queueId}_${jobId}`;
  }

  async function onSubscribe(_, { queueId, jobId }, context) {
    const queueManager = getQueueManager(context, queueId);
    const queue = queueManager.queue;
    const { channelName, pubsub } = context;

    let savedJob;
    let savedState;

    function send(event: string, data: any = null): Promise<void> {
      const payload = {
        event,
        delta: { ...(data || {}) },
      };
      return pubsub.publish(channelName, payload);
    }

    function sendUpdate(delta): void {
      send('updated', delta);
    }

    async function remove(): Promise<void> {
      await send('deleted');
      await cleanup();
      // todo: create and store iterator, then on delete call return()
    }

    async function sendJob(): Promise<void> {
      const job = await queue.getJob(jobId);

      if (!job) {
        return remove();
      }

      // only send what changed
      const json = job.toJSON();
      if (savedState) {
        json['state'] = savedState;
      }
      const delta = diff(json, savedJob);
      savedJob = json;

      if (!isEmpty(delta)) {
        return sendUpdate(delta);
      }
    }

    const update = debounce(sendJob, DELAY, { maxItems: 4 });

    const handler = (event, data) => {
      switch (event) {
        case 'update':
          return update();
        case 'state':
          savedState = data;
          return update();
        case 'remove':
          return remove();
      }
    };
    unsub = queueManager.subscribeToJob(jobId, handler);
  }

  async function onUnsubscribe(): Promise<void> {
    return cleanup();
  }

  return createResolver({
    channelName: getChannelName,
    onSubscribe,
    onUnsubscribe,
  });
}
