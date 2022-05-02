import { JobCounts } from '@alpen/core';
import { get } from '@alpen/shared';
import { JobType, Queue } from 'bullmq';
import { GraphQLResolveInfo } from 'graphql';
import { schemaComposer } from 'graphql-compose';
import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../index';
import boom from '@hapi/boom';

export const obliterateQueue: FieldConfig = {
  description:
    'Completely destroys the queue and all of its contents irreversibly. ' +
    'Note: This operation requires to iterate on all the jobs stored in the queue, ' +
    'and can be slow for very large queues.',
  type: 'JobCounts',
  args: {
    input: schemaComposer.createInputTC({
      name: 'QueueObliterateInput',
      fields: {
        id: {
          type: 'ID!',
        },
        force: {
          type: 'Boolean',
          defaultValue: false,
          description:
            'Use force = true to force obliteration even with active jobs in the queue.',
        },
        count: {
          type: 'Int',
          defaultValue: 1000,
          description:
            'The maximum number of deleted keys per iteration. '
        },
      },
    }),
  },
  resolve: async (
    _,
    { input: { id, force, count } },
    { accessors, loaders }: EZContext,
    info: GraphQLResolveInfo
  ): Promise<JobCounts> => {
    const queue = accessors.getQueueById(id, true);
    if (!isFinite(count) || count < 1) {
      throw boom.badRequest('count must be a positive integer. Got: ' + count);
    }
    const counts = await getJobCounts(queue, loaders, info);
    // TODO: delete all metric and rule data as well
    await queue.obliterate({ force, count });

    return counts;
  },
};

function getJobCounts(queue: Queue, loaders, info: GraphQLResolveInfo): Promise<JobCounts> {
  const fields = get(info, 'fieldNodes[0].selectionSet.selections', []);
  const states: JobType[] = [];
  fields.forEach((node) => {
    const state = node.name.value;
    if (state !== '__typename') states.push(state as JobType);
  });
  const key = {
    queue,
    types: states,
  };
  return loaders.jobCounts.load(key);
}
