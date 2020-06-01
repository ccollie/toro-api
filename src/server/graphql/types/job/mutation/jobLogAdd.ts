import { schemaComposer } from 'graphql-compose';
import { JobStatusEnumType, FieldConfig } from '../../index';
import { getJobById } from '../../../helpers';

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
  }),
  args: {
    queueId: 'String!',
    id: 'String!',
    row: 'String!',
  },
  resolve: async (_, { queueId, id, row }) => {
    const job = await getJobById(queueId, id);

    const [count, state] = await Promise.all([job.log(row), job.getState()]);

    return {
      id,
      count,
      state,
    };
  },
};
