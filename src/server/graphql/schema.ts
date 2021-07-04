import {
  ChangeAggregationEnum,
  Duration,
  ErrorLevelEnum,
  GraphQLDateTime,
  GraphQLEmailAddress,
  GraphQLJSONSchema,
  GraphQLURL,
  GraphQLTimestamp,
  HttpMethodType,
  JobProgress,
  JobRemoveOption,
  JobStatusEnumType,
  OrderEnumType,
  PeakSignalDirectionEnum,
  RuleOperatorEnum,
  RuleStateEnum,
  SeverityType,
} from './resolvers/scalars';

import { MetricCategoryTC } from './resolvers/metric';

import { schemaComposer } from 'graphql-compose';
import * as query from './resolvers/root';
import host from './resolvers/host';
import queue from './resolvers/queue';
import job from './resolvers/job';
import rule from './resolvers/rule';
import metric from './resolvers/metric';

// Scalars
schemaComposer.add(ChangeAggregationEnum);
schemaComposer.add(Duration);
schemaComposer.add(ErrorLevelEnum);
schemaComposer.add(GraphQLDateTime);
schemaComposer.add(GraphQLEmailAddress);
schemaComposer.add(GraphQLJSONSchema);
schemaComposer.add(GraphQLURL);
schemaComposer.add(GraphQLTimestamp);
schemaComposer.add(HttpMethodType);
schemaComposer.add(JobProgress);
schemaComposer.add(JobRemoveOption);
schemaComposer.add(JobStatusEnumType);
schemaComposer.add(OrderEnumType);
schemaComposer.add(PeakSignalDirectionEnum);
schemaComposer.add(RuleOperatorEnum);
schemaComposer.add(RuleStateEnum);
schemaComposer.add(SeverityType);
schemaComposer.add(MetricCategoryTC);

schemaComposer.Query.addFields({
  ...query,
});

schemaComposer.Mutation.addFields({
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

export const schema = schemaComposer.buildSchema();
export const toSDL = () => schemaComposer.toSDL();
