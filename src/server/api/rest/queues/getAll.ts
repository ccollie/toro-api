import pMap from 'p-map';
import { getQueueInfo } from './utils';
import { asyncHandler } from '../middleware';
import { HostManager, Supervisor } from '../../../monitor';
import { Request, Response } from '/express';

export const getAll = asyncHandler(async (req: Request, res: Response) => {
  const monitor = req.app.locals.context.monitor as Supervisor;
  const hostList = monitor.hosts;
  const resp = await pMap(
    hostList,
    (host: HostManager) => {
      const queues = host.getQueues();
      return getQueueInfo(host.name, queues);
    },
    { concurrency: 4 },
  );

  const result = {};
  resp.forEach((queues, index) => {
    result[hostList[index].name] = queues;
  });
  res.json(result);
});
