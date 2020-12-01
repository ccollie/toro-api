import { QueueTC, FieldConfig } from '../types';
import { Supervisor } from '../../supervisor';
import { Queue } from 'bullmq';

export const getQueueById: FieldConfig = {
  type: QueueTC,
  description: 'Delete a queue and all associated data',
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
