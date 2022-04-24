import * as boom from '@hapi/boom';
import { Metric } from './metric';
import { hashObject, safeParse } from '@alpen/shared';
import { logger } from '../logger';
import { MetricName } from './metric-name';
import { parseMetricName } from './metric-name-parser';

export function createMetricFromCanonicalName(canonical: string): MetricName {
  const parsed = parseMetricName(canonical);
  let name: MetricName;
  if (!parsed.metric) {
    throw boom.badData(`unrecognized metric name "${parsed.name}"`);
  }

  return name;
}

export function createMetricFromJSON(json: Record<string, any>): Metric {
  const { id, name } = json as Record<string, any>;

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

  const type = metricName.type;
  const metric = new Metric(name);
  if (!metric) {
    logger.error(`Error loading metric. Type "${type}" invalid.`);
    return metric;
  }

  metric.id = id;

  return metric;
}

export function serializeMetric(metric: Metric): Record<string, any> {
  const json: Record<string, any> = {
    ...metric.toJSON(),
  };
  json.id = json.id || metric.id || hashObject(json);
  return json;
}
