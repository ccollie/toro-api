import { asyncHandler as wrap } from '../../middleware';
import { getStatsClient } from './utils';
import { Request, Response } from 'express';

export default wrap(async (req: Request, res: Response) => {
  const { jobType, metric, granularity } = req.params;
  const client = getStatsClient(req, res);

  const data = await client.getLast(jobType, metric, granularity);
  res.json(data);
});
