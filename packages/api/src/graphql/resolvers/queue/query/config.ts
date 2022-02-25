import { QueueConfig } from '@alpen/core';
import { Queue } from 'bullmq';
import { schemaComposer } from 'graphql-compose';
import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../utils';

export const QueueConfigTC = schemaComposer.createObjectTC({
  name: 'QueueConfig',
  description: 'Queue configuration',
  fields: {
    id: {
      type: 'ID!',
      description: 'the queue id',
    },
    name: {
      type: 'String!',
      description: 'the queue name',
    },
    prefix: {
      type: 'String',
      description: 'the queue prefix',
    },
    isReadonly: {
      type: 'Boolean!',
      description: 'returns true if the queue is readonly',
    },
    allowRetries: {
      type: 'Boolean!',
      description: 'returns true if the jobs can be retried',
    },
  },
});

export const config: FieldConfig = {
  type: QueueConfigTC,
  description: 'Queue configuration',
  resolve: (queue: Queue, _: unknown, { accessors }: EZContext): QueueConfig => {
    const manager = accessors.getQueueManager(queue);
    return {
      isReadonly: false,
      allowRetries: true,
      ...manager.config
    };
  },
}
