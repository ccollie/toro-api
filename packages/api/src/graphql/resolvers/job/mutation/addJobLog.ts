import { schemaComposer } from 'graphql-compose';
import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../index';

const AddJobLogInput = schemaComposer.createInputTC({
  name: 'AddJobLogInput',
  fields: {
    queueId: {
      type: 'ID!',
      description: 'The id of the queue the job belongs to',
    },
    id: {
      type: 'ID!',
      description: 'The id of the job',
    },
    message: {
      type: 'String!',
      description: 'The message to log',
    },
  },
});

export const addJobLog: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'AddJobLogResult',
    fields: {
      count: {
        type: 'Int!',
        description: 'The number of log entries after adding',
      },
    },
  }).NonNull,
  args: {
    input: AddJobLogInput.NonNull,
  },
  resolve: async (_, { input: { queueId, id, message } }, { accessors }: EZContext) => {
    const job = await accessors.getJobById(queueId, id, true);
    const count = await job.log(message);

    return {
      count,
    };
  },
};
