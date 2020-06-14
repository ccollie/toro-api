import { getQueueListener } from '../../helpers';
import { createResolver } from '../../../subscription';
import { GraphQLFieldResolver } from 'graphql';

/* eslint @typescript-eslint/no-use-before-define: 0 */

export function jobDeleted(): GraphQLFieldResolver<any, any> {
  function getChannelName(_, { queueId, jobId }): string {
    return `JOB_DELETED_${queueId}_${jobId}`;
  }

  // TODO: would it be better to simply use keyspace notifications ?
  async function onSubscribe(_, { queueId, jobId }, context) {
    const listener = getQueueListener(context, queueId);

    const event = `job.${jobId}`;

    const iterator = listener.createAsyncIterator({
      eventNames: [event],
      filter,
      transform,
    });

    function filter(_, { event }): boolean {
      return event === 'removed';
    }

    function cleanup(): void {
      setTimeout(() => {
        iterator.return(undefined).then(() => {
          console.log('Stopped observing job #' + jobId);
        });
      }, 120);
    }

    function transform(_, event): any {
      if (event) {
        cleanup();
        return {
          queueId,
          jobId,
        };
      }
    }

    return iterator;
  }

  return createResolver({
    channelName: getChannelName,
    onSubscribe,
  });
}
