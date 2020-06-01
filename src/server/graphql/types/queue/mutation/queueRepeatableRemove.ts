import { schemaComposer } from 'graphql-compose';
import { getQueueById } from '../../../helpers';
import { FieldConfig, QueueTC } from '../../index';

export const queueRepeatableRemove: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'QueueRemoveRepeatablePayload',
    fields: {
      queue: QueueTC,
    },
  }),
  args: {
    id: 'ID!',
    jobName: 'String',
    repeat: schemaComposer.createInputTC({
      name: 'RepeatableJobRemoveOptions',
      fields: {
        tz: 'String',
        endDate: 'Date',
        cron: 'String',
        every: 'String',
      },
    }).NonNull,
  },
  resolve: async (_, { id, jobName, repeat }) => {
    const queue = await getQueueById(id);
    await queue.removeRepeatable(jobName, repeat);
    // todo: publish()
    return { queue };
  },
};
