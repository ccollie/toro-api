import { jobDeleted } from './jobDeleted';
import { jobUpdated } from './jobUpdated';
import { jobLogAdded } from './jobLogAdded';
import { pubsub } from '../../../subscription';

export const Subscription = {
  jobCreated: {
    subscribe: (_, { queueId }) => {
      const channel = `JOB_CREATED_${queueId}`;
      return pubsub.asyncIterator(channel);
    },
  },
  jobDeleted: {
    subscribe: jobDeleted(),
  },
  jobUpdated: {
    subscribe: jobUpdated(),
  },
  jobLogAdded: {
    subscribe: jobLogAdded(),
  },
};
