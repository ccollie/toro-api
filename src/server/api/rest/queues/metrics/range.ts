import { getStatsClient } from './utils';
import { asyncHandler as wrap } from '../../middleware';

export default wrap(async (req, res) => {
  const { jobType, metric, granularity } = req.params;
  const client = getStatsClient(req, res);

  const response = (await client.getSpan(jobType, metric, granularity)) || [
    null,
    null,
  ];

  const data = {
    start: response[0],
    end: response[1],
  };

  res.json(data);
});
