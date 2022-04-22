import * as boom from '@hapi/boom';
import { Metric } from './metric';
import {
  parseTimestamp,
  hashObject,
  parseBool,
  safeParse,
} from '@alpen/shared';
import { isObject } from '@alpen/shared';
import { logger } from '../logger';
import { MetricName } from './metric-name';

export function createMetricFromJSON(json: Record<string, any>): Metric {
  /// TODO: Hackish handling of createdAt, updatedAt
  const {
    id,
    name,
    options: _options,
    createdAt,
    updatedAt,
    isActive,
  } = json as Record<string, any>;

  // todo: id ?

  let metricName: MetricName;
  if (name) {
    if (typeof name === 'string') {
      const obj = safeParse(name);
      if (typeof obj === 'object') {
        metricName = MetricName.fromJSON(obj);
      }
    }
  }

  if (!metricName) {
    throw boom.badData('Error parsing metric name');
  }

  let options: Record<string, any>;
  if (typeof _options == 'string') {
    options = JSON.parse(_options);
    if (!isObject(options)) {
      throw boom.badRequest('Object expected for "options" field');
    }
  } else {
    options = _options;
  }

  const type = metricName.type;
  const metric = new Metric(name, options);
  if (!metric) {
    logger.error(`Error loading metric. Type "${type}" invalid.`);
    return metric;
  }

  metric.id = id;

  if (createdAt) {
    metric.createdAt = parseTimestamp(createdAt);
  }

  if (updatedAt) {
    metric.updatedAt = parseTimestamp(createdAt);
  }

  metric.isActive = parseBool(isActive);

  return metric;
}

export function serializeMetric(metric: Metric): Record<string, any> {
  const json: Record<string, any> = {
    ...metric.toJSON(),
  };
  json.id = json.id || metric.id || hashObject(json);
  // serialize object fields
  if (isObject(json.options)) {
    json.options = JSON.stringify(json.options);
  }
  return json;
}
