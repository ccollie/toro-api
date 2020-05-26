import { asyncHandler as wrap } from '../../middleware';
import { parseRangeQuery } from './parse-range-query';
import { formatSnapshot } from '../../../../monitor/stats/utils';
import { isEmpty, pick } from 'lodash';
import {
  calculateRelativeRange,
  parseTimestamp,
} from '../../../../lib/datetime';
import { getStreamId, getStatsClient } from './utils';
import { Request, Response } from 'express';

const THROUGHPUT_FIELDS = [
  'completed',
  'failed',
  'startTime',
  'endTime',
  'ratePerSecond',
  'count',
  'timestamp',
];

async function getSnapshot(res: Response, key: string, fields: string[]) {
  const { queue } = res.locals;

  const client = await queue.client;
  let response = await client.hgetall(key);

  if (response) {
    response = formatSnapshot(response);
    if (fields && fields.length) {
      response = pick(response, fields);
    }
  }

  return response || {};
}

async function getStreamDataBase(req: Request, res: Response, key: string) {
  const client = getStatsClient(req, res);

  let response;

  if (isEmpty(req.query)) {
    response = await client.call('last', key);
  } else {
    // see if we
    let params = parseRangeQuery(req.query);
    if (!params.start) {
      params = calculateRelativeRange('last_hour');
    }
    const { start, end } = params;
    response = await client.getRange(key, start, end);
  }

  if (!response || !response.length) {
    return [];
  }

  return response;
}

async function getStreamData(
  req: Request,
  res: Response,
  key: string,
  fields: string[],
) {
  const isPick = Array.isArray(fields);
  let response = await getStreamDataBase(req, res, key);

  response = response.map(({ ts, value }) => {
    ts = parseTimestamp(ts);
    if (value.data) {
      delete value.data;
    }
    value = isPick ? pick(value, fields) : value;
    return [ts, value];
  });
  return response;
}

async function metricHandler(req: Request, res: Response) {
  const { metric, type } = req.params;
  const qf = req.query.fields;

  let fields = [];
  if (qf) {
    if (!Array.isArray(qf)) {
      fields = String(qf).split(',');
    } else {
      fields = qf as string[];
    }
  } else {
    fields = metric === 'throughput' ? THROUGHPUT_FIELDS : [];
  }

  const streamId = getStreamId(req, res);

  let result;
  if (type === 'snapshot') {
    result = await getSnapshot(res, streamId, fields);
  } else {
    result = await getStreamData(req, res, streamId, fields);
  }

  res.json(result);
}

export default wrap(metricHandler);
