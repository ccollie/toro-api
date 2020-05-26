import boom from '@hapi/boom';
import { getStatsKey } from '../../../../monitor/keys';

const VALID_GRANULARITIES = [
  'minute',
  'min',
  'hour',
  'hr',
  'day',
  'd',
  'week',
  'wk',
];

function getKey(req, res, tag: string, granularity: string = null): string {
  const { host, jobType } = req.params;
  const queue = res.locals.queue;
  if (granularity) {
    if (!VALID_GRANULARITIES.includes(granularity)) {
      throw boom.badRequest(`invalid value "${granularity}" for granularity`);
    }
  }
  return getStatsKey(host, queue, jobType, tag, granularity);
}

export function getStatsClient(req, res) {
  const { monitor } = req.app.locals.context;
  const queueManager = monitor.getQueueManager(res.locals.queue);
  return queueManager && queueManager.statsClient;
}

export function getStreamId(req, res) {
  const { metric, type } = req.params;

  function getBaseStreamId(): string {
    const tag = metric;
    const granularity = req.query.granularity;
    return getKey(req, tag, granularity);
  }

  let streamId;
  if (type) {
    if (type === 'snapshot') {
      streamId = getKey(req, res, `${metric}:snapshot`);
    }
  } else {
    streamId = getBaseStreamId();
  }

  if (!streamId) {
    throw boom.badRequest('Unable to determine stream');
  }

  return streamId;
}
