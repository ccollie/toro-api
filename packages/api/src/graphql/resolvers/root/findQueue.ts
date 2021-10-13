import { EZContext } from 'graphql-ez';
import { QueueTC, FieldConfig } from '../index';
import { Queue } from 'bullmq';

export const findQueue: FieldConfig = {
  type: QueueTC,
  description: 'Find a queue by name',
  args: {
    hostName: {
      type: 'String!',
    },
    prefix: 'String',
    queueName: 'String!',
  },
  resolve(
    _,
    { hostName, prefix, queueName },
    { supervisor }: EZContext,
  ): Queue {
    return supervisor.getQueue(hostName, prefix, queueName);
  },
};
