import boom from '@hapi/boom';
import { BaseMetric, OutlierMethod } from '@alpen/core';
import { TimeseriesDataPoint } from '@alpen/core';
import { OutlierDetectionMethod } from '../../../typings';
import {
  getFilteredMetricData,
  getMetricData,
} from '../../../loaders/metric-data';
import { DataLoaderRegistry } from '../../../loaders';

export async function getData(
  loaders: DataLoaderRegistry,
  metric: BaseMetric,
  start: number,
  end: number,
  filter?: {
    method: OutlierDetectionMethod;
    threshold?: number;
  },
): Promise<TimeseriesDataPoint[]> {
  if (!(start && end)) {
    throw boom.badRequest('Either start/end or range must be specified');
  }
  if (filter) {
    const method = (filter?.method ??
      OutlierDetectionMethod.Sigma) as unknown as OutlierMethod;
    const threshold = filter?.threshold;

    const _filter = {
      method,
      threshold,
    };
    return getFilteredMetricData(loaders, { metric, start, end }, _filter);
  }

  return getMetricData(loaders, metric, start, end);
}
