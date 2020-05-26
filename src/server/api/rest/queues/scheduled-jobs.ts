import { parseBool } from '../../../lib';
import pSettle, { PromiseRejectedResult } from 'p-settle';
import boom from '@hapi/boom';
const router = require('express').Router({ mergeParams: true });
import { asyncHandler as wrap } from '../middleware';
import { Request, Response, NextFunction } from 'express';

async function exportData(req: Request, res: Response): Promise<void> {
  const queue = res.locals.queue;

  const jobs = await queue.getRepeatableJobs();
  const stringData = JSON.stringify(jobs, null, 2);
  const filename = `${queue.name}-scheduled-dump.json`;

  res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
  res.setHeader('Content-Description', 'Jobs Data Export');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Pragma', 'no-cache');
  res.send(stringData);
}

async function getJobs(req: Request, res: Response): Promise<void> {
  const { queueManager } = res.locals;
  const isExport = parseBool(req.query.export);
  const { offset, limit = 25 } = req.query;

  if (isExport) {
    return exportData(req, res);
  }

  const asc = parseBool(req.query.asc);
  const jobs = await queueManager.getRepeatableJobs(offset, limit, asc);
  res.json(jobs);
}

async function removeByKey(req: Request, res: Response): Promise<void> {
  const { key } = req.params;
  const queue = res.locals.queue;
  await queue.removeRepeatableByKey(key);
  res.sendStatus(200);
}

async function removeMulti(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const { keys } = req.body;
  const queue = res.locals.queue;

  if (!Array.isArray(keys) || !keys.length) {
    return next(boom.badRequest('Expected an array of keys'));
  }
  const calls = keys.map((key) => queue.removeRepeatableByKey(key));
  const settled = await pSettle(calls, { concurrency: 4 });
  const status = settled.map((info, index) => {
    const result = {
      key: keys[index],
      success: info.isFulfilled,
    };
    if (!info.isFulfilled) {
      (result as any).reason = (info as PromiseRejectedResult).reason;
    }
    return result;
  });
  res.json(status);
}

router.get('/', wrap(getJobs));
router.delete('/', wrap(removeMulti));
router.delete('/:key', wrap(removeByKey));

export default router;
