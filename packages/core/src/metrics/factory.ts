import * as boom from '@hapi/boom';
import { Metric } from './metric';
import { safeParse } from '@alpen/shared';
import { logger } from '../logger';
import { MetricName } from './metric-name';

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
