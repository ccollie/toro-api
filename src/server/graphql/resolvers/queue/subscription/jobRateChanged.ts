import { MetricTypeEnum } from '../../../imports';
import { GraphQLFieldResolver } from 'graphql';
import { createMetricResolver } from './metrics';

export function jobRateChanged(): GraphQLFieldResolver<any, any> {
  return createMetricResolver(MetricTypeEnum.JobRate);
}
