import { asyncHandler as wrap } from '../../middleware';
import { parseBool } from '../../../../lib';
import { toJson, exportData } from './utils';
import { Request, Response } from 'express';

export const findJobs = wrap(async (req: Request, res: Response) => {
  const { queueManager } = res.locals;
  const isExport = parseBool(req.query.export);
  const { state = 'completed', offset, limit = 25 } = req.query;

  if (isExport) {
    return exportData(state, req, res);
  }

  let asc = undefined === req.query.asc ? undefined : parseBool(req.query.asc);

  if (['completed', 'failed'].includes('' + state)) {
    // override default sort-order
    asc = false;
  }

  const jobs = await queueManager.getJobs(state, offset, limit, asc);
  jobs.jobs = jobs.jobs.map((x) => toJson(x, state));
  res.json(jobs);
});
