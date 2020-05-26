'use strict';
import { getQueueInfo } from './queues/utils';

const router = require('express').Router({ mergeParams: true });
import { asyncHandler as wrap, populateHost } from './middleware';
import { Request, Response } from 'express';

const redisInfo = async (req: Request, res: Response) => {
  const host = res.locals.host;
  const info = await host.getRedisInfo();
  res.json(info);
};

const getAll = async (req: Request, res: Response) => {
  const { Monitor } = req.app.locals;
  const result = await Monitor.hosts.map((x) => x.name);
  res.json(result);
};

const getHostQueues = async (req: Request, res: Response) => {
  const name = req.params.host;
  const { host: hostManager } = res.locals;
  const queues = hostManager.getQueues();
  const response = await getQueueInfo(name, queues);
  res.json(response);
};

async function discoverQueues(req: Request, res: Response) {
  const host = res.locals.host;
  const queues = await host.discoverQueues();
  res.json(queues);
}

router.use('/:host', populateHost);

router.get('/', wrap(getAll));
router.get('/:host', wrap(getHostQueues));
router.get('/:host/redis', wrap(redisInfo));
router.get('/:host/discover-queues', wrap(discoverQueues));

export default router;
