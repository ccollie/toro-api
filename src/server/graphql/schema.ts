import {
  ChangeAggregationEnumType,
  Duration,
  ErrorLevelEnum,
  GraphQLDateTime,
  GraphQLJSONSchema,
  HttpMethodType,
  JobProgress,
  JobRemoveOption,
  JobStatusEnumType,
  OrderEnumType,
  PeakSignalDirectionType,
  RuleOperatorType,
  RuleStateType,
  SeverityType,
} from './resolvers/scalars';

import { schemaComposer } from 'graphql-compose';
import * as query from './resolvers/query';
import host from './resolvers/host';
import queue from './resolvers/queue';
import job from './resolvers/job';
import rule from './resolvers/rule';

schemaComposer.add(ChangeAggregationEnumType);
schemaComposer.add(Duration);
schemaComposer.add(ErrorLevelEnum);
schemaComposer.add(GraphQLDateTime);
schemaComposer.add(GraphQLJSONSchema);
schemaComposer.add(HttpMethodType);
schemaComposer.add(JobProgress);
schemaComposer.add(JobRemoveOption);
schemaComposer.add(JobStatusEnumType);
schemaComposer.add(OrderEnumType);
schemaComposer.add(PeakSignalDirectionType);
schemaComposer.add(RuleOperatorType);
schemaComposer.add(RuleStateType);
schemaComposer.add(SeverityType);

schemaComposer.Query.addFields({
  ...query,
});

schemaComposer.Mutation.addFields({
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
});

const schema = schemaComposer.buildSchema();

export { schema };
