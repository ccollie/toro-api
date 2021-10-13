import { schemaComposer } from 'graphql-compose';
import { EZContext } from 'graphql-ez';
import { FieldConfig, QueueTC } from '../../index';

export const repeatableJobRemove: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'QueueRemoveRepeatablePayload',
    fields: {
      queue: QueueTC.NonNull,
    },
  }).NonNull,
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
  resolve: async (_, { id, jobName, repeat }, { accessors }: EZContext) => {
    const queue = accessors.getQueueById(id, true);
    await queue.removeRepeatable(jobName, repeat);
    // todo: publish()
    return { queue };
  },
};
