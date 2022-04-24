import {
  ChangeAggregationEnum,
  CleanQueueJobType,
  Duration,
  ErrorLevelEnum,
  ExtendedMetricScalarType,
  FinishedStatus,
  GraphQLDateTime,
  GraphQLEmailAddress,
  GraphQLJSONSchema,
  GraphQLURL,
  GraphQLTimestamp,
  HttpMethodType,
  JobProgress,
  JobRemoveOption,
  JobState,
  JobType,
  JobSearchStatus,
  MetricCategory,
  OrderEnumType,
  PeakSignalDirectionEnum,
  RuleOperatorEnum,
  RuleStateEnum,
  SeverityType,
} from './scalars';

import { schemaComposer } from 'graphql-compose';
import * as query from './resolvers/root';
import flow from './resolvers/flow';
import host from './resolvers/host';
import queue from './resolvers/queue';
import job from './resolvers/job';
import rule from './resolvers/rule';
import metric from './resolvers/metric';
import { GraphQLSchema } from 'graphql';
import { logger } from '@alpen/core';

// Scalars
schemaComposer.add(ChangeAggregationEnum);
schemaComposer.add(CleanQueueJobType);
schemaComposer.add(Duration);
schemaComposer.add(ErrorLevelEnum);
schemaComposer.add(ExtendedMetricScalarType);
schemaComposer.add(FinishedStatus);
schemaComposer.add(GraphQLDateTime);
schemaComposer.add(GraphQLEmailAddress);
schemaComposer.add(GraphQLJSONSchema);
schemaComposer.add(GraphQLURL);
schemaComposer.add(GraphQLTimestamp);
schemaComposer.add(HttpMethodType);
schemaComposer.add(JobProgress);
schemaComposer.add(JobRemoveOption);
schemaComposer.add(JobState);
schemaComposer.add(JobType);
schemaComposer.add(JobSearchStatus);
schemaComposer.add(OrderEnumType);
schemaComposer.add(PeakSignalDirectionEnum);
schemaComposer.add(RuleOperatorEnum);
schemaComposer.add(RuleStateEnum);
schemaComposer.add(SeverityType);
schemaComposer.add(MetricCategory);
schemaComposer.add(flow.JobNode);

schemaComposer.Query.addFields({
  ...query,
});

schemaComposer.Mutation.addFields({
  ...flow.Mutation,
  ...metric.Mutation,
  ...host.Mutation,
  ...job.Mutation,
  ...queue.Mutation,
  ...rule.Mutation,
});

schemaComposer.Subscription.addFields({
  ...host.Subscription,
  ...job.Subscription,
  ...queue.Subscription,
  ...rule.Subscription,
  ...metric.Subscription,
});


let schema: GraphQLSchema;

export const getSchema = (): GraphQLSchema => {
  if (!schema) {
    logger.info('building schema');
    schema = schemaComposer.buildSchema();
    logger.info('building schema: done');
  }
  return schema;
};

export const getSDL = () => {
  getSchema();
  return schemaComposer.toSDL();
};
