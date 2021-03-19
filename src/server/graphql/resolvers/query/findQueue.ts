import { QueueTC, FieldConfig } from '../index';
import { Supervisor } from '../../../supervisor';
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
  resolve(_, { hostName, prefix, queueName }, { supervisor }): Queue {
    return (supervisor as Supervisor).getQueue(hostName, prefix, queueName);
  },
};
