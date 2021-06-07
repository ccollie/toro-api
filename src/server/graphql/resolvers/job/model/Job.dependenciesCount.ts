import { schemaComposer } from 'graphql-compose';
import { FieldConfig } from '../../utils';
import { Job } from 'bullmq';
import {
  JobDependenciesCountInput,
  JobDependenciesCountPayload,
} from '../../../typings';

export const JoDependenciesCountInputTC = schemaComposer.createInputTC({
  name: 'JobDependenciesCountInput',
  fields: {
    processed: 'Boolean',
    unprocessed: 'Boolean',
  },
});

const JobDependenciesCountPayloadTC = schemaComposer.createObjectTC({
  name: 'JobDependenciesCountPayload',
  fields: {
    processed: 'Int',
    unprocessed: 'Int',
  },
});

export const dependenciesCount: FieldConfig = {
  description:
    'Get children job counts if this job is a parent and has children.',
  type: JobDependenciesCountPayloadTC.NonNull,
  args: {
    input: JoDependenciesCountInputTC,
  },
  async resolve(
    job: Job,
    { input }: { input: JobDependenciesCountInput },
  ): Promise<JobDependenciesCountPayload> {
    return job.getDependenciesCount(input);
  },
};
