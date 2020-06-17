import { MetricType } from '../../../imports';
import { GraphQLFieldResolver } from 'graphql';
import { createMetricResolver } from './metrics';

export function consecutiveErrorCountChanged(): GraphQLFieldResolver<any, any> {
  return createMetricResolver(MetricType.ConsecutiveFailures);
}
