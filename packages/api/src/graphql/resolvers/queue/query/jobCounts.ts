import { Queue } from 'bullmq';
import type { JobType } from 'bullmq';
import { get } from '@alpen/shared';
import { schemaComposer } from 'graphql-compose';
import { FieldConfig } from '../../utils';
import { EZContext } from 'graphql-ez';

export const JobCountsTC = schemaComposer.createObjectTC({
  name: 'JobCounts',
  description: 'The count of jobs according to status',
  fields: {
    completed: 'Int',
    failed: 'Int',
    delayed: 'Int',
    active: 'Int',
    waiting: 'Int',
    // ['waiting-children']: 'Int',
    paused: 'Int',
  },
});

export const jobCounts: FieldConfig = {
  type: JobCountsTC.NonNull,
  async resolve(
    queue: Queue,
    args: unknown,
    context: EZContext,
    info: unknown,
  ): Promise<Record<string, number>> {
    // get field names/states
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
    return context.loaders.jobCounts.load(key);
  },
};