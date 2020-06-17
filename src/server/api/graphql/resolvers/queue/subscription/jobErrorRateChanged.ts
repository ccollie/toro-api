import { MetricType } from '../../../imports';
import { GraphQLFieldResolver } from 'graphql';
import { createMetricResolver } from './metrics';

export function jobErrorRateChanged(): GraphQLFieldResolver<any, any> {
  return createMetricResolver(MetricType.ErrorRate);
}
