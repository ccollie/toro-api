import { getJobState } from '../../../../models/jobs';
import { parseBool } from '../../../../lib';
import { toJson } from './utils';
import { asyncHandler as wrap } from '../../middleware';
import { Request, Response } from 'express';
import pAll from 'p-all';

export const getById = wrap(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { queue } = res.locals.queue;
  const includeLogs =
    req.query.includeLogs !== undefined && parseBool(req.query.includeLogs);

  const calls = [() => queue.getJob(id), () => getJobState(queue, id)];

  if (includeLogs) {
    calls.push(() => queue.getJobLogs(id));
  }

  const [job, state, logs] = await pAll(calls);

  const data = toJson(job, state);
  if (includeLogs) {
    data.logs = logs || [];
  }
  res.json(data);
});
