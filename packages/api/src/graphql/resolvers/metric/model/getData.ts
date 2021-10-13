import { BaseMetric } from '@alpen/core/metrics';
import {
  filterOutlierObjects,
  OutlierMethod,
  TimeseriesDataPoint,
} from '@alpen/core/stats';
import { DateLike } from '@alpen/shared';
import boom from '@hapi/boom';
import { EZContext } from 'graphql-ez';
import {
  Maybe,
  OutlierDetectionMethod,
  OutlierFilterInput,
} from '../../../typings';

export interface GetDataOptions {
  from?: DateLike;
  to?: DateLike;
  outlierFilter?: Maybe<OutlierFilterInput>;
}

export async function getMetricData(
  context: EZContext,
  metric: BaseMetric,
  options: GetDataOptions,
): Promise<TimeseriesDataPoint[]> {
  const { from: start, to: end, outlierFilter } = options;
  if (!(start && end)) {
    throw boom.badRequest('Either start/end or range must be specified');
  }
  const data = await context.loaders.metricData.load({ metric, start, end });
  if (outlierFilter) {
    const method = (outlierFilter?.method ??
      OutlierDetectionMethod.Sigma) as unknown as OutlierMethod;
    const threshold = outlierFilter?.threshold;
    return filterOutlierObjects(method, data, (x) => x.value, { threshold });
  }

  return data;
}
