import { FieldConfig } from '../../';
import { getFilteredQueues, HostManager } from '../../../../hosts';
import { Queue } from 'bullmq';
import { schemaComposer } from 'graphql-compose';

const HostQueuesFilter = schemaComposer.createInputTC({
  name: 'HostQueuesFilter',
  fields: {
    search: {
      type: 'String',
      description: 'Regex pattern for queue name matching',
    },
    prefix: {
      type: 'String',
      description: 'Queue prefix',
    },
    isPaused: {
      type: 'Boolean',
      description: 'Filter based on paused state',
    },
    isActive: {
      type: 'Boolean',
      description:
        'Filter based on "active" status (true if the queue has at least one worker) ',
    },
  },
});

export const hostQueues: FieldConfig = {
  type: '[Queue!]!',
  description: 'The queues registered for this host',
  args: {
    filter: HostQueuesFilter,
  },
  resolve: async (host: HostManager, { filter }): Promise<Queue[]> => {
    if (!filter) {
      return host.getQueues();
    }
    const { search, isPaused, isActive, prefix } = filter;
    return getFilteredQueues(host, { search, isActive, isPaused, prefix });
  },
};
