import { schemaComposer } from 'graphql-compose';
import { EZContext } from 'graphql-ez';
import { JobStatusEnumType, FieldConfig } from '../../index';

export const jobLogAdd: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'JobLogAddPayload',
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
        type: JobStatusEnumType,
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
