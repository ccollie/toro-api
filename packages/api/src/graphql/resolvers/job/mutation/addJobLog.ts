import { schemaComposer } from 'graphql-compose';
import { EZContext } from 'graphql-ez';
import { JobType, FieldConfig } from '../../index';

export const addJobLog: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'AddJobLogResult',
    fields: {
      id: {
        type: 'String!',
        description: 'The job id',
      },
      count: {
        type: 'Int!',
        description: 'The number of log entries after adding',
      },
      state: {
        type: JobType,
        makeRequired: true,
      },
    },
  }).NonNull,
  args: {
    queueId: 'String!',
    id: 'String!',
    row: 'String!',
  },
  resolve: async (_, { queueId, id, row }, { accessors }: EZContext) => {
    const job = await accessors.getJobById(queueId, id, true);

    const [count, state] = await Promise.all([job.log(row), job.getState()]);

    return {
      id,
      count,
      state,
    };
  },
};
