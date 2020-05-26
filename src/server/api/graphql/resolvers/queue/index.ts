import { getQueueById } from '../helpers';
import { Supervisor } from '../../../common/imports';
import { Queue } from 'bullmq';
import { Subscription } from './subscription';
import { Mutation } from './mutation';
import { model } from './model';

const Query = {
  queue(_, { id }, ctx): Queue {
    return getQueueById(ctx, id);
  },
  findQueue(_, { hostName, queueName }, { supervisor }): Queue {
    return (supervisor as Supervisor).getQueue(hostName, queueName);
  },
};

export const queueResolver = {
  Query,
  Queue: model,
  Mutation,
  Subscription,
};
