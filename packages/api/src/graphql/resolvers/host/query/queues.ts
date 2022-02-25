import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../index';
import { Queue } from 'bullmq';
import { schemaComposer } from 'graphql-compose';
import { QueueFilterStatusEnum } from '../../../scalars';
import { HostQueuesFilter as GQLQueueFilter } from '../../../typings';
import {
  getFilteredQueues,
  HostManager,
  QueueFilterStatus,
} from '@alpen/core';

const HostQueuesFilter = schemaComposer.createInputTC({
  name: 'HostQueuesFilter',
  fields: {
    search: {
      type: 'String',
      description: 'Regex pattern for queue name matching',
    },
    prefixes: {
      type: '[String!]',
      description: 'Return Queues with these prefixes',
    },
    statuses: {
      type: [QueueFilterStatusEnum.NonNull],
      description: 'Statuses to filter on',
    },
    include: {
      type: '[String!]',
      description: 'Ids of queues to include',
    },
    exclude: {
      type: '[String!]',
      description: 'Ids of queues to exclude',
    },
  },
});

export const queues: FieldConfig = {
  type: '[Queue!]!',
  description: 'The queues registered for this host',
  args: {
    filter: HostQueuesFilter,
  },
  async resolve(
    host: HostManager,
    { filter }: { filter: GQLQueueFilter },
    { accessors }: EZContext,
  ): Promise<Queue[]> {
    if (!filter) {
      return host.getQueues();
    }
    const {
      search,
      prefixes,
      include = [],
      exclude = [],
      statuses: _statuses = [],
    } = filter;
    // TODO: fix this
    const statuses: QueueFilterStatus[] = _statuses.map(
      (x) => x.toUpperCase() as QueueFilterStatus,
    );
    const queues = await getFilteredQueues(host, {
      search,
      prefixes,
      statuses,
    });
    if (queues.length && (exclude.length || include.length)) {
      const includeSet = new Set(include);
      const excludeSet = new Set(exclude);
      return queues.filter((q) => {
        const id = accessors.getQueueId(q);
        return (!include.length || includeSet.has(id)) && !excludeSet.has(id);
      });
    }
    return queues;
  },
};
