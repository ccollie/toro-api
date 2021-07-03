import { BaseMetric } from '@server/metrics';
import { TimeseriesDataPoint } from '@src/types';
import boom from '@hapi/boom';
import { OutlierDetectionMethod } from '@server/graphql/typings';
import { OutlierMethod } from '@server/stats/outliers';
import {
  getFilteredMetricData,
  getMetricData,
} from '@server/graphql/loaders/metric-data';
import { DataLoaderRegistry } from '@server/graphql/loaders';

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
      OutlierDetectionMethod.SmoothedZScore) as unknown as OutlierMethod;
    const threshold = filter?.threshold;

    const _filter = {
      method,
      threshold,
    };
    return getFilteredMetricData(loaders, { metric, start, end }, _filter);
  }

  return getMetricData(loaders, metric, start, end);
}
