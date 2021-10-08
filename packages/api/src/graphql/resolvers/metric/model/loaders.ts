import { DataLoaderRegistry } from '../../../loaders';
import { BaseMetric, filterOutlierObjects, OutlierMethod, TimeseriesDataPoint } from '@alpen/core';
import { DateLike } from '@alpen/shared';
import { MetricDataLoaderKey } from '../../../loaders/metric-data';

const LOADER_NAME = 'metricData';

export function getMetricData(
  loaders: DataLoaderRegistry,
  metric: BaseMetric,
  start?: DateLike,
  end?: DateLike,
  limit?: number,
): Promise<TimeseriesDataPoint[]> {
  const loader = loaders.getLoader<
    MetricDataLoaderKey,
    TimeseriesDataPoint[],
    string
    >(LOADER_NAME);
  const key: MetricDataLoaderKey = {
    metric,
    start,
    end,
    limit,
  };
  return loader.load(key);
}

export async function getFilteredMetricData(
  loaders: DataLoaderRegistry,
  options: MetricDataLoaderKey,
  outlierFilter?: {
    method: OutlierMethod;
    threshold?: number;
  },
): Promise<TimeseriesDataPoint[]> {
  const { metric, start, end, limit } = options;
  const data = await getMetricData(loaders, metric, start, end, limit);
  if (outlierFilter) {
    const { method, threshold } = outlierFilter;
    return filterOutlierObjects(method, data, (x) => x.value, { threshold });
  }
  return data;
}
