import { schemaComposer } from 'graphql-compose';
import { Queue } from 'bullmq';
import { FieldConfig } from '../../utils';
import { QueueWorker } from '@src/types';
import { getQueueManager } from '../../../helpers';
import toDate from 'date-fns/toDate';

export const QueueWorkerTC = schemaComposer.createObjectTC({
  // see https://redis.io/commands/client-list
  name: 'QueueWorker',
  fields: {
    id: 'String',
    addr: {
      type: 'String!',
      description: 'address of the client',
    },
    name: 'String',
    age: {
      type: 'Int!',
      description: 'total duration of the connection (in seconds)',
    },
    idle: {
      type: 'Int!',
      description: 'Idle time of the connection (in seconds)',
    },
    started: {
      type: 'DateTime',
      description: 'Date/time when the connection started',
      resolve(parent: QueueWorker): Date {
        return toDate(parent.started);
      },
    },
    db: {
      type: 'Int!',
      description: 'the current database number',
    },
    role: 'String',
    sub: 'Int!',
    multi: 'Int!',
    qbuf: 'Int!',
    qbufFree: 'Int!',
    obl: 'Int!',
    oll: 'Int!',
    omem: 'Int!',
  },
});

export const queueWorkers: FieldConfig = {
  args: {
    limit: 'Int',
  },
  type: QueueWorkerTC.NonNull.List.NonNull,
  async resolve(queue: Queue, args: any): Promise<QueueWorker[]> {
    const manager = getQueueManager(queue);
    let workers = await manager.getWorkers();
    workers = workers.map((worker) => {
      //worker.host = parent.host;
      return worker;
    });
    workers = workers.sort((a, b) => a.idle - b.idle);
    if (args.limit) {
      const limit = parseInt(args.limit);
      workers = workers.slice(0, limit - 1);
    }
    return workers;
  },
};
