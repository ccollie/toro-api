/* eslint-disable */
import type { DocumentNode } from 'graphql';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null;
export type Exact<T extends { [key: string]: unknown }> = {
  [K in keyof T]: T[K];
};
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]?: Maybe<T[SubKey]>;
};
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
  [SubKey in K]: Maybe<T[SubKey]>;
};
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  Date: any;
  /** An ISO date-time string, such as 2007-12-03T10:15:30Z. Also handles Elastic compatible date-math expr:  https://www.elastic.co/guide/en/elasticsearch/reference/current/common-options.html#date-math. */
  DateTime: number;
  /** Specifies a duration in milliseconds - either as an int or a string specification e.g. "2 min", "3 hr" */
  Duration: string | number;
  /** A field whose value conforms to the standard internet email address format as specified in RFC822: https://www.w3.org/Protocols/rfc822/. */
  EmailAddress: string;
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
  JSON: any;
  /** The `JSONObject` scalar type represents JSON objects as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
  JSONObject: { [key: string]: unknown };
  /** The `JSONSchema` scalar type represents JSONSchema values as specified by https://json-schema.org/draft/2019-09/json-schema-validation.html. */
  JSONSchema: { [key: string]: unknown };
  /** Job process. Either a number (percentage) or user specified data */
  JobProgress: string | number | Record<string, unknown>;
  /** Specifies the number of jobs to keep after an operation (e.g. complete or fail).A bool(true) causes a job to be removed after the action */
  JobRemoveOption: boolean | number;
  /** The javascript `Date` as integer. Type represents date and time as number of milliseconds from start of UNIX epoch. */
  Timestamp: number;
  /** A field whose value conforms to the standard URL format as specified in RFC3986: https://www.ietf.org/rfc/rfc3986.txt. */
  URL: string;
};

export type ActivateRuleInput = {
  queueId: Scalars['ID'];
  ruleId: Scalars['ID'];
};

export type ActivateRuleResult = {
  __typename?: 'ActivateRuleResult';
  isActive: Scalars['Boolean'];
  rule: Rule;
};

export type AddJobLogResult = {
  __typename?: 'AddJobLogResult';
  /** The number of log entries after adding */
  count: Scalars['Int'];
  /** The job id */
  id: Scalars['String'];
  state?: Maybe<JobType>;
};

export type AggregateInfo = {
  __typename?: 'AggregateInfo';
  description: Scalars['String'];
  isWindowed: Scalars['Boolean'];
  type: AggregateTypeEnum;
};

export const AggregateTypeEnum = {
  Ewma: 'Ewma',
  Identity: 'Identity',
  Latest: 'Latest',
  Max: 'Max',
  Mean: 'Mean',
  Min: 'Min',
  None: 'None',
  P75: 'P75',
  P90: 'P90',
  P95: 'P95',
  P99: 'P99',
  P995: 'P995',
  Quantile: 'Quantile',
  StdDev: 'StdDev',
  Sum: 'Sum',
} as const;

export type AggregateTypeEnum =
  typeof AggregateTypeEnum[keyof typeof AggregateTypeEnum];
export type Aggregator = {
  __typename?: 'Aggregator';
  description: Scalars['String'];
  options?: Maybe<Scalars['JSONObject']>;
  type: AggregateTypeEnum;
};

export type AggregatorInput = {
  options?: InputMaybe<Scalars['JSONObject']>;
  type: AggregateTypeEnum;
};

export type AppInfo = {
  __typename?: 'AppInfo';
  author?: Maybe<Scalars['String']>;
  brand?: Maybe<Scalars['String']>;
  /** The server environment (development, production, etc) */
  env: Scalars['String'];
  /** The app title */
  title: Scalars['String'];
  /** The core version */
  version: Scalars['String'];
};

export type BulkJobActionInput = {
  jobIds: Array<Scalars['ID']>;
  queueId: Scalars['ID'];
};

export type BulkJobActionPayload = {
  __typename?: 'BulkJobActionPayload';
  queue: Queue;
  status: Array<Maybe<BulkStatusItem>>;
};

export type BulkJobItemInput = {
  data: Scalars['JSONObject'];
  name: Scalars['String'];
  options?: InputMaybe<JobOptionsInput>;
};

export type BulkStatusItem = {
  __typename?: 'BulkStatusItem';
  id: Scalars['ID'];
  reason?: Maybe<Scalars['String']>;
  success: Scalars['Boolean'];
};

export const ChangeAggregation = {
  Avg: 'AVG',
  Max: 'MAX',
  Min: 'MIN',
  P90: 'P90',
  P95: 'P95',
  P99: 'P99',
  Sum: 'SUM',
} as const;

export type ChangeAggregation =
  typeof ChangeAggregation[keyof typeof ChangeAggregation];
export type ChangeConditionInput = {
  aggregationType: ChangeAggregation;
  changeType: ConditionChangeType;
  /** The value needed to trigger an error notification */
  errorThreshold: Scalars['Float'];
  /** The comparison operator */
  operator: RuleOperator;
  /** Lookback period (ms). How far back are we going to compare eg 1 hour means we're comparing now vs 1 hour ago */
  timeShift: Scalars['Duration'];
  /** The value needed to trigger an warning notification */
  warningThreshold?: InputMaybe<Scalars['Float']>;
  /** The sliding window for metric measurement */
  windowSize: Scalars['Duration'];
};

export type ChangeJobDelayInput = {
  delay: Scalars['Int'];
  jobId: Scalars['String'];
  queueId: Scalars['String'];
};

export const CleanQueueJobType = {
  Active: 'active',
  Completed: 'completed',
  Delayed: 'delayed',
  Failed: 'failed',
  Paused: 'paused',
  Wait: 'wait',
} as const;

export type CleanQueueJobType =
  typeof CleanQueueJobType[keyof typeof CleanQueueJobType];
export type ClearRuleAlertsResult = {
  __typename?: 'ClearRuleAlertsResult';
  /** The count of deleted alerts */
  deletedItems: Scalars['Int'];
  rule: Rule;
};

export type ClesrRuleAlertsInput = {
  queueId: Scalars['ID'];
  ruleId: Scalars['ID'];
};

export const ConditionChangeType = {
  Change: 'CHANGE',
  Pct: 'PCT',
} as const;

export type ConditionChangeType =
  typeof ConditionChangeType[keyof typeof ConditionChangeType];
export type CreateBulkJobsResult = {
  __typename?: 'CreateBulkJobsResult';
  jobs: Array<Maybe<Job>>;
};

export type CreateFlowInput = {
  /** The host to which to add the flow */
  host: Scalars['String'];
  job: FlowJobInput;
};

export type CreateJobFilterInput = {
  expression: Scalars['String'];
  name: Scalars['String'];
  /** A pattern to match against the job id e.g. email-*-job */
  pattern?: InputMaybe<Scalars['String']>;
  queueId: Scalars['ID'];
  status?: InputMaybe<JobSearchStatus>;
};

export type CreateJobInput = {
  data?: InputMaybe<Scalars['JSONObject']>;
  jobName: Scalars['String'];
  options?: InputMaybe<JobOptionsInput>;
  queueId: Scalars['ID'];
};

export type CreateMailNotificationChannelInput = {
  channel: MailNotificationChannelUpdate;
  hostId: Scalars['ID'];
};

/** Input fields for creating a metric */
export type CreateMetricInput = {
  aggregator?: InputMaybe<AggregatorInput>;
  /** A description of the metric being measured. */
  description?: InputMaybe<Scalars['String']>;
  /** Is the metric active (i.e. is data being collected). */
  isActive: Scalars['Boolean'];
  /** The name of the metric */
  name: Scalars['String'];
  /** The metric options */
  options: Scalars['JSONObject'];
  /** The id of the queue to which the metric belongs */
  queueId: Scalars['ID'];
  /** The metric sampling interval. */
  sampleInterval?: InputMaybe<Scalars['Int']>;
  type: MetricType;
};

export type CreateRepeatableJobByCronInput = {
  data?: InputMaybe<Scalars['JSONObject']>;
  jobName: Scalars['ID'];
  options?: InputMaybe<JobOptionsInput>;
  queueId: Scalars['ID'];
};

export type CreateRepeatableJobByCronResult = {
  __typename?: 'CreateRepeatableJobByCronResult';
  job?: Maybe<Job>;
};

/** Information required to add or edit a Rule */
export type CreateRuleInput = {
  /** Notification channel ids */
  channels?: InputMaybe<Array<Scalars['String']>>;
  /** The rule condition */
  condition: RuleConditionInput;
  /** A helpful description of the rule */
  description?: InputMaybe<Scalars['String']>;
  /** Is this rule active or not */
  isActive: Scalars['Boolean'];
  /** Optional text for message when an alert is raised. Markdown and handlebars supported */
  message?: InputMaybe<Scalars['String']>;
  /** The id of the metric being monitored */
  metricId: Scalars['String'];
  /** The names of the rule */
  name: Scalars['String'];
  /** Options controlling the generation of events */
  options?: InputMaybe<RuleAlertOptionsInput>;
  /** Optional data passed on to alerts */
  payload?: InputMaybe<Scalars['JSONObject']>;
  /** The id of the queue to which the rule belongs */
  queueId: Scalars['ID'];
  severity?: InputMaybe<Severity>;
};

export type CreateWebhookNotificationChannelInput = {
  channel: WebhookNotificationChannelUpdate;
  hostId: Scalars['ID'];
};

export type DeleteJobFilterInput = {
  filterId: Scalars['ID'];
  queueId: Scalars['ID'];
};

export type DeleteJobFilterResult = {
  __typename?: 'DeleteJobFilterResult';
  filterId: Scalars['String'];
  isDeleted: Scalars['Boolean'];
  queue: Queue;
};

export type DeleteJobPayload = {
  __typename?: 'DeleteJobPayload';
  job: Job;
  queue: Queue;
};

export type DeleteJobSchemaInput = {
  jobName: Scalars['String'];
  queueId: Scalars['ID'];
};

export type DeleteJobSchemaResult = {
  __typename?: 'DeleteJobSchemaResult';
  jobName: Scalars['String'];
  queue: Queue;
};

export type DeleteJobsByFilterInput = {
  /** The maximum number of jobs to remove per iteration */
  count?: InputMaybe<Scalars['Int']>;
  /** The job filter expression */
  expression: Scalars['String'];
  /** Optional job id pattern e.g. "j[?]b-*" */
  pattern?: InputMaybe<Scalars['String']>;
  /** The id of the queue */
  queueId: Scalars['ID'];
  /** Search for jobs having this status */
  status?: InputMaybe<JobSearchStatus>;
};

export type DeleteJobsByFilterPayload = {
  __typename?: 'DeleteJobsByFilterPayload';
  /** The number of jobs removed this iteration */
  removed: Scalars['Int'];
};

export type DeleteJobsByPatternInput = {
  /** The maximum number of jobs to remove per iteration */
  countPerIteration?: InputMaybe<Scalars['Int']>;
  /** The job pattern. e.g uploads:* */
  pattern?: InputMaybe<Scalars['String']>;
  /** The id of the queue */
  queueId: Scalars['ID'];
  /** Filter by jobs having this status */
  status?: InputMaybe<JobSearchStatus>;
};

export type DeleteJobsByPatternPayload = {
  __typename?: 'DeleteJobsByPatternPayload';
  /** The number of jobs removed this iteration */
  removed: Scalars['Int'];
};

export type DeleteMetricInput = {
  metricId: Scalars['ID'];
  queueId: Scalars['ID'];
};

export type DeleteMetricResult = {
  __typename?: 'DeleteMetricResult';
  isDeleted: Scalars['Boolean'];
  queue: Queue;
};

export type DeleteNotificationChannelResult = {
  __typename?: 'DeleteNotificationChannelResult';
  channelId: Scalars['ID'];
  deleted: Scalars['Boolean'];
  hostId: Scalars['ID'];
};

export type DeleteQueueDeleteResult = {
  __typename?: 'DeleteQueueDeleteResult';
  /** The number of jobs in the queue at the time of deletion */
  deletedJobCount: Scalars['Int'];
  /** The queue host */
  host: QueueHost;
  /** The id of the deleted queue */
  queueId: Scalars['ID'];
  /** The name of the deleted queue */
  queueName: Scalars['String'];
};

export type DeleteQueueOptions = {
  checkActivity?: InputMaybe<Scalars['Boolean']>;
  checkExistence?: InputMaybe<Scalars['Boolean']>;
};

export type DeleteQueueStatsInput = {
  /** Optional stats granularity. If omitted, the entire range of data is deleted */
  granularity?: InputMaybe<StatsGranularity>;
  /** Optional job name to delete stats for. If omitted, all queue stats are erased */
  jobName?: InputMaybe<Scalars['String']>;
  queueId: Scalars['ID'];
};

export type DeleteQueueStatsResult = {
  __typename?: 'DeleteQueueStatsResult';
  isDeleted: Scalars['Boolean'];
  queue: Queue;
};

export type DeleteRepeatableJobByKeyInput = {
  key: Scalars['String'];
  queueId: Scalars['ID'];
};

export type DeleteRepeatableJobByKeyResult = {
  __typename?: 'DeleteRepeatableJobByKeyResult';
  key: Scalars['String'];
  queue?: Maybe<Queue>;
};

export type DeleteRepeatableJobOptions = {
  cron?: InputMaybe<Scalars['String']>;
  endDate?: InputMaybe<Scalars['Date']>;
  every?: InputMaybe<Scalars['String']>;
  tz?: InputMaybe<Scalars['String']>;
};

export type DeleteRepeatableJobResult = {
  __typename?: 'DeleteRepeatableJobResult';
  queue: Queue;
};

export type DeleteRuleAlertInput = {
  alertId: Scalars['ID'];
  queueId: Scalars['ID'];
  ruleId: Scalars['ID'];
};

export type DeleteRuleAlertResult = {
  __typename?: 'DeleteRuleAlertResult';
  isDeleted: Scalars['Boolean'];
  rule?: Maybe<Rule>;
  ruleId: Scalars['ID'];
};

export type DeleteRuleInput = {
  queueId: Scalars['ID'];
  ruleId: Scalars['ID'];
};

export type DeleteRuleResult = {
  __typename?: 'DeleteRuleResult';
  isDeleted: Scalars['Boolean'];
  queueId: Scalars['ID'];
  ruleId: Scalars['ID'];
};

export type DisableNotificationChannelResult = {
  __typename?: 'DisableNotificationChannelResult';
  updated: Scalars['Boolean'];
};

/** Marks a job to not be retried if it fails (even if attempts has been configured) */
export type DiscardJobResult = {
  __typename?: 'DiscardJobResult';
  job: Job;
};

export type DiscoverQueuesPayload = {
  __typename?: 'DiscoverQueuesPayload';
  /** The queue name */
  name: Scalars['String'];
  /** The queue prefix */
  prefix: Scalars['String'];
};

export type DrainQueueResult = {
  __typename?: 'DrainQueueResult';
  queue: Queue;
};

export type EnableNotificationChannelResult = {
  __typename?: 'EnableNotificationChannelResult';
  updated: Scalars['Boolean'];
};

export const ErrorLevel = {
  Error: 'ERROR',
  None: 'NONE',
  Warning: 'WARNING',
} as const;

export type ErrorLevel = typeof ErrorLevel[keyof typeof ErrorLevel];
export type FindJobsInput = {
  /** The cursor to start from */
  cursor?: InputMaybe<Scalars['String']>;
  /** A JS compatible Search expression, e.g (name === "transcode") && (responseTime > 10000) */
  expression: Scalars['String'];
  /** Optionally filter jobs by id pattern e.g. foo?-* */
  pattern?: InputMaybe<Scalars['String']>;
  /** The id of the desired queue */
  queueId: Scalars['ID'];
  scanCount?: InputMaybe<Scalars['Int']>;
  /** Optionally filter jobs by status */
  status?: InputMaybe<JobSearchStatus>;
};

export type FindJobsResult = {
  __typename?: 'FindJobsResult';
  /** Total current index of the end of the last set of jobs returned */
  current: Scalars['Int'];
  jobs: Array<Job>;
  nextCursor: Scalars['ID'];
  /** Total number of jobs in the given state, but not necessarily the filtered count */
  total: Scalars['Int'];
};

export const FinishedStatus = {
  Completed: 'completed',
  Failed: 'failed',
} as const;

export type FinishedStatus = typeof FinishedStatus[keyof typeof FinishedStatus];
/** Values needed to create a FlowJob */
export type FlowJobInput = {
  children?: InputMaybe<Array<FlowJobInput>>;
  /** Data for the job */
  data?: InputMaybe<Scalars['JSONObject']>;
  name: Scalars['String'];
  opts?: InputMaybe<FlowJobOptionsInput>;
  /** Prefix of queue */
  prefix?: InputMaybe<Scalars['String']>;
  /** The queue to create the job in */
  queueName: Scalars['String'];
};

export type FlowJobOptionsInput = {
  /** The total number of attempts to try the job until it completes. */
  attempts?: InputMaybe<Scalars['Int']>;
  /** Backoff setting for automatic retries if the job fails */
  backoff?: InputMaybe<Scalars['JSON']>;
  /**
   * An amount of milliseconds to wait until this job can be processed.
   * Note that for accurate delays, worker and producers should have their clocks synchronized.
   */
  delay?: InputMaybe<Scalars['Int']>;
  /** Override the job ID - by default, the job ID is a unique integer, but you can use this setting to override it. If you use this option, it is up to you to ensure the jobId is unique. If you attempt to add a job with an id that already exists, it will not be added. */
  jobId?: InputMaybe<Scalars['String']>;
  /** if true, adds the job to the right of the queue instead of the left (default false) */
  lifo?: InputMaybe<Scalars['Boolean']>;
  /** Ranges from 1 (highest priority) to MAX_INT  (lowest priority). Note that using priorities has a slight impact on performance, so do not use it if not required. */
  priority?: InputMaybe<Scalars['Int']>;
  /** Rate limiter key to use if rate limiter enabled. */
  rateLimiterKey?: InputMaybe<Scalars['String']>;
  /** If true, removes the job when it successfully completes.  A number specify the max amount of jobs to keep.  Default behavior is to keep the job in the COMPLETED set. */
  removeOnComplete?: InputMaybe<Scalars['JobRemoveOption']>;
  /** If true, removes the job when it fails after all attempts.  A number specify the max amount of jobs to keep.  Default behavior is to keep the job in the FAILED set. */
  removeOnFail?: InputMaybe<Scalars['JobRemoveOption']>;
  repeat?: InputMaybe<JobRepeatOptionsCronInput>;
  /** Limits the size in bytes of the job's data payload (as a JSON serialized string). */
  sizeLimit?: InputMaybe<Scalars['Int']>;
  /** Limits the amount of stack trace lines that will be recorded in the stacktrace. */
  stackTraceLimit?: InputMaybe<Scalars['Int']>;
  /** The number of milliseconds after which the job should be fail with a timeout error [optional] */
  timeout?: InputMaybe<Scalars['Int']>;
  /** Timestamp when the job was created. Defaults to `Date.now() */
  timestamp?: InputMaybe<Scalars['Date']>;
};

/** Input type for fetching a flow */
export type FlowNodeGetInput = {
  /** The maximum depth to traverse */
  depth?: InputMaybe<Scalars['Int']>;
  /** The host to search */
  host: Scalars['String'];
  /** The id of the job that is the root of the tree or subtree */
  id: Scalars['String'];
  /** The maximum number of children to fetch per level */
  maxChildren?: InputMaybe<Scalars['Int']>;
  /** Queue prefix */
  prefix?: InputMaybe<Scalars['String']>;
  /** The queue in which the root is found */
  queueName: Scalars['String'];
};

export type GetJobsByIdInput = {
  ids: Array<Scalars['ID']>;
  queueId: Scalars['ID'];
};

export type GetJobsInput = {
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  queueId: Scalars['ID'];
  sortOrder?: InputMaybe<SortOrderEnum>;
  status?: InputMaybe<JobState>;
};

export type HistogramBin = {
  __typename?: 'HistogramBin';
  count: Scalars['Int'];
  /** Lower bound of the bin */
  x0: Scalars['Float'];
  /** Upper bound of the bin */
  x1: Scalars['Float'];
};

/** Options for generating histogram bins */
export type HistogramBinOptionsInput = {
  /** Optional number of bins to select. */
  binCount?: InputMaybe<Scalars['Int']>;
  /** Method used to compute histogram bin count */
  binMethod?: InputMaybe<HistogramBinningMethod>;
  /** Optional maximum value to include in counts */
  maxValue?: InputMaybe<Scalars['Float']>;
  /** Optional minimum value to include in counts */
  minValue?: InputMaybe<Scalars['Float']>;
  /** Generate a "nice" bin count */
  pretty?: InputMaybe<Scalars['Boolean']>;
};

/** The method used to calculate the optimal bin width (and consequently number of bins) for a histogram */
export const HistogramBinningMethod = {
  /** Maximum of the ‘Sturges’ and ‘Freedman’ estimators. Provides good all around performance. */
  Auto: 'Auto',
  /** Calculate the number of histogram bins based on Freedman-Diaconis method */
  Freedman: 'Freedman',
  /** Calculate the number of bins based on the Sturges method */
  Sturges: 'Sturges',
} as const;

export type HistogramBinningMethod =
  typeof HistogramBinningMethod[keyof typeof HistogramBinningMethod];
/** Records histogram binning data */
export type HistogramInput = {
  /** The minimum date to consider */
  from: Scalars['Date'];
  /** Stats snapshot granularity */
  granularity: StatsGranularity;
  /** An optional job name to filter on */
  jobName?: InputMaybe<Scalars['String']>;
  /** The metric requested */
  metric?: InputMaybe<StatsMetricType>;
  options?: InputMaybe<HistogramBinOptionsInput>;
  /** The maximum date to consider */
  to: Scalars['Date'];
};

/** Records histogram binning data */
export type HistogramPayload = {
  __typename?: 'HistogramPayload';
  bins: Array<Maybe<HistogramBin>>;
  /** The maximum value in the data range. */
  max: Scalars['Float'];
  /** The minimum value in the data range. */
  min: Scalars['Float'];
  /** The total number of values. */
  total: Scalars['Int'];
  /** The width of the bins */
  width: Scalars['Float'];
};

export type HostQueuesFilter = {
  /** Ids of queues to exclude */
  exclude?: InputMaybe<Array<Scalars['String']>>;
  /** Ids of queues to include */
  include?: InputMaybe<Array<Scalars['String']>>;
  /** Return Queues with these prefixes */
  prefixes?: InputMaybe<Array<Scalars['String']>>;
  /** Regex pattern for queue name matching */
  search?: InputMaybe<Scalars['String']>;
  /** Statuses to filter on */
  statuses?: InputMaybe<Array<QueueFilterStatus>>;
};

export const HttpMethodEnum = {
  Get: 'GET',
  Post: 'POST',
} as const;

export type HttpMethodEnum = typeof HttpMethodEnum[keyof typeof HttpMethodEnum];
export type InferJobSchemaInput = {
  jobName?: InputMaybe<Scalars['String']>;
  queueId: Scalars['ID'];
};

export type Job = {
  __typename?: 'Job';
  attemptsMade: Scalars['Int'];
  /** Get this jobs children result values as an object indexed by job key, if any. */
  childrenValues: Scalars['JSONObject'];
  data: Scalars['JSONObject'];
  delay: Scalars['Int'];
  /** Get children job keys if this job is a parent and has children. */
  dependencies: JobDependenciesPayload;
  /** Get children job counts if this job is a parent and has children. */
  dependenciesCount: JobDependenciesCountPayload;
  failedReason?: Maybe<Scalars['JSON']>;
  finishedOn?: Maybe<Scalars['Date']>;
  /** Returns the fully qualified id of a job, including the queue prefix and queue name */
  fullId: Scalars['String'];
  id: Scalars['ID'];
  /** Returns true if this job is either a parent or child node in a flow. */
  isInFlow: Scalars['Boolean'];
  /** returns true if this job is waiting. */
  isWaiting: Scalars['Boolean'];
  /** returns true if this job is waiting for children. */
  isWaitingChildren: Scalars['Boolean'];
  logs: JobLogs;
  name: Scalars['String'];
  opts: JobOptions;
  /** Returns the parent of a job that is part of a flow */
  parent?: Maybe<Job>;
  parentKey?: Maybe<Scalars['String']>;
  /** Returns the parent queue of a job that is part of a flow */
  parentQueue?: Maybe<Queue>;
  processedOn?: Maybe<Scalars['Date']>;
  progress?: Maybe<Scalars['JobProgress']>;
  queueId: Scalars['String'];
  returnvalue?: Maybe<Scalars['JSON']>;
  stacktrace: Array<Scalars['String']>;
  state?: Maybe<JobState>;
  timestamp: Scalars['Date'];
};

export type JobDependenciesArgs = {
  input?: InputMaybe<JobDependenciesOptsInput>;
};

export type JobDependenciesCountArgs = {
  input?: InputMaybe<JobDependenciesCountInput>;
};

export type JobLogsArgs = {
  end?: Scalars['Int'];
  start?: Scalars['Int'];
};

export type JobAddEveryInput = {
  data?: InputMaybe<Scalars['JSONObject']>;
  jobName: Scalars['ID'];
  options?: InputMaybe<JobOptionsInput>;
  queueId: Scalars['ID'];
};

export type JobAddEveryPayload = {
  __typename?: 'JobAddEveryPayload';
  job: Job;
};

/** The count of jobs according to status */
export type JobCounts = {
  __typename?: 'JobCounts';
  active?: Maybe<Scalars['Int']>;
  completed?: Maybe<Scalars['Int']>;
  delayed?: Maybe<Scalars['Int']>;
  failed?: Maybe<Scalars['Int']>;
  paused?: Maybe<Scalars['Int']>;
  waiting?: Maybe<Scalars['Int']>;
};

export type JobDependenciesCountInput = {
  processed?: InputMaybe<Scalars['Boolean']>;
  unprocessed?: InputMaybe<Scalars['Boolean']>;
};

export type JobDependenciesCountPayload = {
  __typename?: 'JobDependenciesCountPayload';
  processed?: Maybe<Scalars['Int']>;
  unprocessed?: Maybe<Scalars['Int']>;
};

export type JobDependenciesOptsInput = {
  processed?: InputMaybe<JobDependencyCursorInput>;
  unprocessed?: InputMaybe<JobDependencyCursorInput>;
};

export type JobDependenciesPayload = {
  __typename?: 'JobDependenciesPayload';
  nextProcessedCursor?: Maybe<Scalars['Int']>;
  nextUnprocessedCursor?: Maybe<Scalars['Int']>;
  processed?: Maybe<Scalars['JSONObject']>;
  unprocessed?: Maybe<Array<Scalars['String']>>;
};

export type JobDependencyCursorInput = {
  count?: InputMaybe<Scalars['Int']>;
  cursor?: InputMaybe<Scalars['Int']>;
};

/** Options for filtering queue jobs */
export type JobFilter = {
  __typename?: 'JobFilter';
  /** The date this filter was created */
  createdAt?: Maybe<Scalars['Date']>;
  /** The job filter query */
  expression: Scalars['String'];
  id: Scalars['ID'];
  /** A descriptive name of the filter */
  name: Scalars['String'];
  /** The job filter pattern */
  pattern?: Maybe<Scalars['String']>;
  /** Optional job status to filter jobs by */
  status?: Maybe<JobType>;
};

export type JobLocatorInput = {
  jobId: Scalars['ID'];
  queueId: Scalars['ID'];
};

export type JobLogs = {
  __typename?: 'JobLogs';
  count: Scalars['Int'];
  items: Array<Scalars['String']>;
};

export type JobMemoryUsagePayload = {
  __typename?: 'JobMemoryUsagePayload';
  /** The total number of bytes consumed by the sampled jobs */
  byteCount: Scalars['Int'];
  /** The total number of jobs contributing to the byteCount */
  jobCount: Scalars['Int'];
};

export type JobNode = {
  __typename?: 'JobNode';
  children?: Maybe<Array<Job>>;
  job: Job;
};

export type JobOptions = {
  __typename?: 'JobOptions';
  /** The total number of attempts to try the job until it completes. */
  attempts?: Maybe<Scalars['Int']>;
  /** Backoff setting for automatic retries if the job fails */
  backoff?: Maybe<Scalars['JSON']>;
  /**
   * An amount of milliseconds to wait until this job can be processed.
   * Note that for accurate delays, worker and producers should have their clocks synchronized.
   */
  delay?: Maybe<Scalars['Int']>;
  /** Override the job ID - by default, the job ID is a unique integer, but you can use this setting to override it. If you use this option, it is up to you to ensure the jobId is unique. If you attempt to add a job with an id that already exists, it will not be added. */
  jobId?: Maybe<Scalars['String']>;
  /** if true, adds the job to the right of the queue instead of the left (default false) */
  lifo?: Maybe<Scalars['Boolean']>;
  parent?: Maybe<JobParent>;
  /** Ranges from 1 (highest priority) to MAX_INT  (lowest priority). Note that using priorities has a slight impact on performance, so do not use it if not required. */
  priority?: Maybe<Scalars['Int']>;
  /** Rate limiter key to use if rate limiter enabled. */
  rateLimiterKey?: Maybe<Scalars['String']>;
  /** If true, removes the job when it successfully completes.  A number specify the max amount of jobs to keep.  Default behavior is to keep the job in the COMPLETED set. */
  removeOnComplete?: Maybe<Scalars['JobRemoveOption']>;
  /** If true, removes the job when it fails after all attempts.  A number specify the max amount of jobs to keep.  Default behavior is to keep the job in the FAILED set. */
  removeOnFail?: Maybe<Scalars['JobRemoveOption']>;
  /** Job repeat options */
  repeat?: Maybe<JobRepeatOptions>;
  /** Limits the size in bytes of the job's data payload (as a JSON serialized string). */
  sizeLimit?: Maybe<Scalars['Int']>;
  /** Limits the amount of stack trace lines that will be recorded in the stacktrace. */
  stackTraceLimit?: Maybe<Scalars['Int']>;
  /** The number of milliseconds after which the job should be fail with a timeout error [optional] */
  timeout?: Maybe<Scalars['Int']>;
  /** Timestamp when the job was created. Defaults to `Date.now() */
  timestamp?: Maybe<Scalars['Date']>;
};

export type JobOptionsInput = {
  /** The total number of attempts to try the job until it completes. */
  attempts?: InputMaybe<Scalars['Int']>;
  /** Backoff setting for automatic retries if the job fails */
  backoff?: InputMaybe<Scalars['JSON']>;
  /**
   * An amount of milliseconds to wait until this job can be processed.
   * Note that for accurate delays, worker and producers should have their clocks synchronized.
   */
  delay?: InputMaybe<Scalars['Int']>;
  /** Override the job ID - by default, the job ID is a unique integer, but you can use this setting to override it. If you use this option, it is up to you to ensure the jobId is unique. If you attempt to add a job with an id that already exists, it will not be added. */
  jobId?: InputMaybe<Scalars['String']>;
  /** if true, adds the job to the right of the queue instead of the left (default false) */
  lifo?: InputMaybe<Scalars['Boolean']>;
  parent?: InputMaybe<JobParentInput>;
  /** Ranges from 1 (highest priority) to MAX_INT  (lowest priority). Note that using priorities has a slight impact on performance, so do not use it if not required. */
  priority?: InputMaybe<Scalars['Int']>;
  /** Rate limiter key to use if rate limiter enabled. */
  rateLimiterKey?: InputMaybe<Scalars['String']>;
  /** If true, removes the job when it successfully completes.  A number specify the max amount of jobs to keep.  Default behavior is to keep the job in the COMPLETED set. */
  removeOnComplete?: InputMaybe<Scalars['JobRemoveOption']>;
  /** If true, removes the job when it fails after all attempts.  A number specify the max amount of jobs to keep.  Default behavior is to keep the job in the FAILED set. */
  removeOnFail?: InputMaybe<Scalars['JobRemoveOption']>;
  repeat?: InputMaybe<JobRepeatOptionsCronInput>;
  /** Limits the size in bytes of the job's data payload (as a JSON serialized string). */
  sizeLimit?: InputMaybe<Scalars['Int']>;
  /** Limits the amount of stack trace lines that will be recorded in the stacktrace. */
  stackTraceLimit?: InputMaybe<Scalars['Int']>;
  /** The number of milliseconds after which the job should be fail with a timeout error [optional] */
  timeout?: InputMaybe<Scalars['Int']>;
  /** Timestamp when the job was created. Defaults to `Date.now() */
  timestamp?: InputMaybe<Scalars['Date']>;
};

export type JobParent = {
  __typename?: 'JobParent';
  /** The id of the job */
  id: Scalars['String'];
  /** The name of the queue (including prefix) containing the job */
  queue: Scalars['String'];
};

export type JobParentInput = {
  /** The id of the job */
  id: Scalars['String'];
  /** The name of the queue (including prefix) containing the job */
  queue: Scalars['String'];
};

export type JobRepeatOptions = {
  __typename?: 'JobRepeatOptions';
  count?: Maybe<Scalars['Int']>;
  cron?: Maybe<Scalars['String']>;
  endDate?: Maybe<Scalars['Date']>;
  every?: Maybe<Scalars['String']>;
  jobId?: Maybe<Scalars['String']>;
  limit?: Maybe<Scalars['Int']>;
  prevMillis?: Maybe<Scalars['Int']>;
  startDate?: Maybe<Scalars['Date']>;
  tz?: Maybe<Scalars['String']>;
};

export type JobRepeatOptionsCronInput = {
  count?: InputMaybe<Scalars['Int']>;
  cron: Scalars['String'];
  endDate?: InputMaybe<Scalars['Date']>;
  jobId?: InputMaybe<Scalars['String']>;
  limit?: InputMaybe<Scalars['Int']>;
  prevMillis?: InputMaybe<Scalars['Int']>;
  startDate?: InputMaybe<Scalars['Date']>;
  tz?: InputMaybe<Scalars['String']>;
};

/** Options for validating job data */
export type JobSchema = {
  __typename?: 'JobSchema';
  /** Default options for jobs off this type created through the API */
  defaultOpts?: Maybe<Scalars['JSONObject']>;
  jobName: Scalars['String'];
  /** The JSON schema associated with the job name */
  schema?: Maybe<Scalars['JSONSchema']>;
};

export type JobSchemaInput = {
  defaultOpts?: InputMaybe<JobOptionsInput>;
  jobName: Scalars['String'];
  queueId: Scalars['ID'];
  schema: Scalars['JSONSchema'];
};

export const JobSearchStatus = {
  Active: 'active',
  Completed: 'completed',
  Delayed: 'delayed',
  Failed: 'failed',
  Paused: 'paused',
  Waiting: 'waiting',
  WaitingChildren: 'waiting_children',
} as const;

export type JobSearchStatus =
  typeof JobSearchStatus[keyof typeof JobSearchStatus];
export const JobState = {
  Active: 'active',
  Completed: 'completed',
  Delayed: 'delayed',
  Failed: 'failed',
  Waiting: 'waiting',
  WaitingChildren: 'waiting_children',
} as const;

export type JobState = typeof JobState[keyof typeof JobState];
/** Base implementation for job stats information. */
export type JobStatsInterface = {
  /** The number of completed jobs in the sample interval */
  completed: Scalars['Int'];
  /** The sample size */
  count: Scalars['Int'];
  /** The end of the interval */
  endTime: Scalars['Date'];
  /** The number of failed jobs in the sample interval */
  failed: Scalars['Int'];
  /** The start of the interval */
  startTime: Scalars['Date'];
};

export const JobType = {
  Active: 'active',
  Completed: 'completed',
  Delayed: 'delayed',
  Failed: 'failed',
  Paused: 'paused',
  Repeat: 'repeat',
  Wait: 'wait',
  Waiting: 'waiting',
  WaitingChildren: 'waiting_children',
} as const;

export type JobType = typeof JobType[keyof typeof JobType];
export type JobUpdateDelta = {
  __typename?: 'JobUpdateDelta';
  delta: Scalars['JSONObject'];
  id: Scalars['String'];
};

export type JobsByFilterInput = {
  /** The maximum number of jobs to return per iteration */
  count?: InputMaybe<Scalars['Int']>;
  /** The iterator cursor. Iteration starts when the cursor is set to null, and terminates when the cursor returned by the server is null */
  cursor?: InputMaybe<Scalars['String']>;
  /** The filter expression. Specify this or the filterId, but not both. */
  expression?: InputMaybe<Scalars['String']>;
  /** The id of an existing filter. Specify this or the expression, but not both. */
  filterId?: InputMaybe<Scalars['ID']>;
  /** Job id pattern e.g. "job-*". */
  pattern?: InputMaybe<Scalars['String']>;
  /** Optional job status to filter on. One of "active", "completed", "failed", "paused", "waiting","delayed". */
  status?: InputMaybe<JobSearchStatus>;
};

export type JobsByFilterPayload = {
  __typename?: 'JobsByFilterPayload';
  /** The number of jobs iterated over so far. */
  current: Scalars['Int'];
  /** The updated iteration cursor. Set to null when iteration is complete. */
  cursor?: Maybe<Scalars['String']>;
  /** The jobs matching the filter for the current iteration */
  jobs: Array<Job>;
  /** The approximate number of jobs to iterate over. */
  total: Scalars['Int'];
};

export type JobsMemoryAvgInput = {
  /** Consider only jobs of this type (optional) */
  jobName?: InputMaybe<Scalars['String']>;
  /** An optional upper limit of jobs to sample for the average */
  limit?: InputMaybe<Scalars['Int']>;
  /** Job status to consider. Defaults to completed. */
  status?: InputMaybe<JobType>;
};

/** A channel which sends notifications through email */
export type MailNotificationChannel = NotificationChannel & {
  __typename?: 'MailNotificationChannel';
  /** Timestamp of channel creation */
  createdAt?: Maybe<Scalars['Date']>;
  /** Is the channel enabled ? */
  enabled: Scalars['Boolean'];
  id: Scalars['ID'];
  /** The name of the channel */
  name: Scalars['String'];
  /** Emails of notification recipients */
  recipients: Array<Maybe<Scalars['EmailAddress']>>;
  /** The type of the channel, e.g. slack, email, webhook etc */
  type: Scalars['String'];
  /** Timestamp of last channel update */
  updatedAt?: Maybe<Scalars['Date']>;
};

export type MailNotificationChannelUpdate = {
  /** Is the channel enabled ? */
  enabled: Scalars['Boolean'];
  /** The name of the channel */
  name: Scalars['String'];
  /** Emails of notification recipients */
  recipients: Array<InputMaybe<Scalars['EmailAddress']>>;
  /** The type of the channel, e.g. slack, email, webhook etc */
  type: Scalars['String'];
};

export type MarkRuleAlertAsReadInput = {
  alertId: Scalars['ID'];
  isRead: Scalars['Boolean'];
  queueId: Scalars['ID'];
  ruleId: Scalars['ID'];
};

export type MarkRuleAlertAsReadResult = {
  __typename?: 'MarkRuleAlertAsReadResult';
  alert: RuleAlert;
};

/** Records the rate of events over an interval using an exponentially moving average */
export type Meter = {
  __typename?: 'Meter';
  /** The number of samples. */
  count: Scalars['Int'];
  /** The 1 minute average */
  m1Rate: Scalars['Float'];
  /** The 5 minute average */
  m5Rate: Scalars['Float'];
  /** The 15 minute average */
  m15Rate: Scalars['Float'];
  /** The average rate since the meter was started. */
  meanRate: Scalars['Float'];
};

/** Metrics are numeric samples of data collected over time */
export type Metric = {
  __typename?: 'Metric';
  aggregator: Aggregator;
  category: MetricCategory;
  /** Timestamp of when this metric was created */
  createdAt: Scalars['Date'];
  /** The current value of the metric */
  currentValue?: Maybe<Scalars['Float']>;
  data: Array<Maybe<TimeseriesDataPoint>>;
  /** Returns the timestamps of the first and last data items recorded for the metric */
  dateRange?: Maybe<TimeSpan>;
  /** Returns the description of the metric */
  description: Scalars['String'];
  histogram: HistogramPayload;
  /** the id of the metric */
  id: Scalars['ID'];
  /** Is the metric active (i.e. is data being collected). */
  isActive: Scalars['Boolean'];
  /** The name of the metric */
  name: Scalars['String'];
  /** The metric options */
  options: Scalars['JSONObject'];
  /** Uses a rolling mean and a rolling deviation (separate) to identify peaks in metric data */
  outliers: Array<Maybe<TimeseriesDataPoint>>;
  /** Compute a percentile distribution. */
  percentileDistribution: PercentileDistribution;
  /** The id of the queue to which the metric belongs */
  queueId: Scalars['ID'];
  /** The metric sampling interval. */
  sampleInterval?: Maybe<Scalars['Int']>;
  /** Returns simple descriptive statistics from a range of metric data */
  summaryStats: SummaryStatistics;
  type: MetricType;
  unit: Scalars['String'];
  /** Timestamp of when this metric was created */
  updatedAt: Scalars['Date'];
};

/** Metrics are numeric samples of data collected over time */
export type MetricDataArgs = {
  input: MetricDataInput;
};

/** Metrics are numeric samples of data collected over time */
export type MetricHistogramArgs = {
  input: MetricsHistogramInput;
};

/** Metrics are numeric samples of data collected over time */
export type MetricOutliersArgs = {
  input: MetricDataOutliersInput;
};

/** Metrics are numeric samples of data collected over time */
export type MetricPercentileDistributionArgs = {
  input: MetricPercentileDistributionInput;
};

/** Metrics are numeric samples of data collected over time */
export type MetricSummaryStatsArgs = {
  input: MetricDataInput;
};

export const MetricCategory = {
  Host: 'Host',
  Queue: 'Queue',
  Redis: 'Redis',
} as const;

export type MetricCategory = typeof MetricCategory[keyof typeof MetricCategory];
export type MetricDataInput = {
  end: Scalars['Date'];
  outlierFilter?: InputMaybe<OutlierFilterInput>;
  start: Scalars['Date'];
};

export type MetricDataOutliersInput = {
  end: Scalars['Date'];
  method?: OutlierDetectionMethod;
  start: Scalars['Date'];
  /** the threshold for outline detection. Defaults depend on the method of detection */
  threshold?: InputMaybe<Scalars['Float']>;
};

export type MetricInfo = {
  __typename?: 'MetricInfo';
  category: MetricCategory;
  description?: Maybe<Scalars['String']>;
  isPolling: Scalars['Boolean'];
  key: Scalars['String'];
  type: MetricType;
  unit?: Maybe<Scalars['String']>;
  valueType: MetricValueType;
};

/** Input fields for updating a metric */
export type MetricInput = {
  aggregator?: InputMaybe<AggregatorInput>;
  /** A description of the metric being measured. */
  description?: InputMaybe<Scalars['String']>;
  /** the id of the metric */
  id: Scalars['ID'];
  /** Is the metric active (i.e. is data being collected). */
  isActive: Scalars['Boolean'];
  /** The name of the metric */
  name?: InputMaybe<Scalars['String']>;
  /** The metric options */
  options?: InputMaybe<Scalars['JSONObject']>;
  /** The id of the queue to which the metric belongs */
  queueId: Scalars['ID'];
  /** The metric sampling interval. */
  sampleInterval?: InputMaybe<Scalars['Int']>;
  type: MetricType;
};

export type MetricPercentileDistributionInput = {
  from: Scalars['Date'];
  outlierFilter?: InputMaybe<OutlierFilterInput>;
  /** The percentiles to get frequencies for */
  percentiles?: InputMaybe<Array<Scalars['Float']>>;
  to: Scalars['Date'];
};

export const MetricStatusType = {
  Completed: 'completed',
  Failed: 'failed',
} as const;

export type MetricStatusType =
  typeof MetricStatusType[keyof typeof MetricStatusType];
export const MetricType = {
  ActiveJobs: 'ActiveJobs',
  Apdex: 'Apdex',
  Completed: 'Completed',
  CompletedRate: 'CompletedRate',
  ConnectedClients: 'ConnectedClients',
  ConsecutiveFailures: 'ConsecutiveFailures',
  CurrentCompletedCount: 'CurrentCompletedCount',
  CurrentFailedCount: 'CurrentFailedCount',
  DelayedJobs: 'DelayedJobs',
  ErrorPercentage: 'ErrorPercentage',
  ErrorRate: 'ErrorRate',
  Failures: 'Failures',
  Finished: 'Finished',
  FragmentationRatio: 'FragmentationRatio',
  InstantaneousOps: 'InstantaneousOps',
  JobRate: 'JobRate',
  Latency: 'Latency',
  None: 'None',
  PeakMemory: 'PeakMemory',
  PendingCount: 'PendingCount',
  ResponseTime: 'ResponseTime',
  UsedMemory: 'UsedMemory',
  WaitTime: 'WaitTime',
  Waiting: 'Waiting',
  WaitingChildren: 'WaitingChildren',
} as const;

export type MetricType = typeof MetricType[keyof typeof MetricType];
export const MetricValueType = {
  Count: 'Count',
  Gauge: 'Gauge',
  Rate: 'Rate',
} as const;

export type MetricValueType =
  typeof MetricValueType[keyof typeof MetricValueType];
export type MetricsDataInput = {
  /** The end of the date range to query */
  end?: InputMaybe<Scalars['DateTime']>;
  /** The start of the date range to query */
  start?: InputMaybe<Scalars['DateTime']>;
  /** The type of metric to fetch */
  type: MetricStatusType;
};

/** Compute a frequency distribution of a range of metric data. */
export type MetricsHistogramInput = {
  /** The minimum date to consider */
  from: Scalars['Date'];
  options?: InputMaybe<HistogramBinOptionsInput>;
  outlierFilter?: InputMaybe<OutlierFilterInput>;
  /** The maximum date to consider */
  to: Scalars['Date'];
};

export type MetricsTimeseries = {
  __typename?: 'MetricsTimeseries';
  /** The data points for the timeseries. */
  data: Array<TimeseriesDataPoint>;
  /** Metadata about the timeseries */
  meta: TimeseriesMeta;
};

export type MoveJobToCompletedResult = {
  __typename?: 'MoveJobToCompletedResult';
  job?: Maybe<Job>;
  queue: Queue;
};

export type MoveJobToDelayedInput = {
  /** The amount of time to delay execution (in ms) */
  delay?: InputMaybe<Scalars['Duration']>;
  jobId: Scalars['ID'];
  queueId: Scalars['ID'];
};

export type MoveJobToDelayedResult = {
  __typename?: 'MoveJobToDelayedResult';
  delay: Scalars['Int'];
  /** Estimated date/time of execution */
  executeAt: Scalars['Date'];
  job: Job;
};

export type MoveJobToFailedInput = {
  failedReason?: InputMaybe<Scalars['String']>;
  jobId: Scalars['ID'];
  queueId: Scalars['ID'];
};

export type MoveoJobToFailedResult = {
  __typename?: 'MoveoJobToFailedResult';
  job: Job;
  queue: Queue;
};

export type Mutation = {
  __typename?: 'Mutation';
  /** Delete a rule alert */
  DeleteRuleAlert: DeleteRuleAlertResult;
  /** Removes all alerts associated with a rule */
  activateRule: ActivateRuleResult;
  addJobLog: AddJobLogResult;
  bulkCreateJobs?: Maybe<CreateBulkJobsResult>;
  /** Bulk deletes a list of jobs by id */
  bulkDeleteJobs?: Maybe<BulkJobActionPayload>;
  /** Bulk promotes a list of jobs by id */
  bulkPromoteJobs?: Maybe<BulkJobActionPayload>;
  /** Bulk retries a list of jobs by id */
  bulkRetryJobs?: Maybe<BulkJobActionPayload>;
  changeJobDelay: Job;
  /** Remove all jobs created outside of a grace interval in milliseconds. You can clean the jobs with the following states: completed, wait, active, delayed, paused, and failed. */
  cleanQueue: QueueCleanResult;
  /** Removes all alerts associated with a rule */
  clearRuleAlerts: ClearRuleAlertsResult;
  createFlow: JobNode;
  createJob: Job;
  /** Add a named job filter */
  createJobFilter: JobFilter;
  /** Add a mail notification channel */
  createMailNotificationChannel: MailNotificationChannel;
  /** Create a queue metric */
  createMetric: Metric;
  createRepeatableJob: JobAddEveryPayload;
  createRepeatableJobByCron: CreateRepeatableJobByCronResult;
  /** Create a rule for a queue */
  createRule: Rule;
  /** Create a slack notification channel */
  createSlackNotificationChannel: SlackNotificationChannel;
  /** Add a webhook notification channel */
  createWebhookNotificationChannel: WebhookNotificationChannel;
  deleteJob: DeleteJobPayload;
  /** Delete a job filter */
  deleteJobFilter: DeleteJobFilterResult;
  /** Delete a schema associated with a job name on a queue */
  deleteJobSchema: DeleteJobSchemaResult;
  /** Delete jobs by filter expression */
  deleteJobsByFilter: DeleteJobsByFilterPayload;
  /** Incrementally delete jobs filtered by pattern */
  deleteJobsByPattern: DeleteJobsByPatternPayload;
  /** Delete a queue metric */
  deleteMetric: DeleteMetricResult;
  deleteNotificationChannel: DeleteNotificationChannelResult;
  deleteQueue: DeleteQueueDeleteResult;
  /** Delete all stats associated with a queue */
  deleteQueueStats: DeleteQueueStatsResult;
  deleteRepeatableJob: DeleteRepeatableJobResult;
  deleteRepeatableJobByKey: DeleteRepeatableJobByKeyResult;
  /** Delete a rule */
  deleteRule: DeleteRuleResult;
  disableNotificationChannel: DisableNotificationChannelResult;
  discardJob: DiscardJobResult;
  /** Drains the queue, i.e., removes all jobs that are waiting or delayed, but not active, completed or failed. */
  drainQueue: DrainQueueResult;
  enableNotificationChannel: EnableNotificationChannelResult;
  /** Delete a rule alert */
  markRuleAlertAsRead: MarkRuleAlertAsReadResult;
  moveJobToCompleted: MoveJobToCompletedResult;
  /** Moves job from active to delayed. */
  moveJobToDelayed: MoveJobToDelayedResult;
  moveJobToFailed: MoveoJobToFailedResult;
  /** Completely destroys the queue and all of its contents irreversibly. Note: This operation requires to iterate on all the jobs stored in the queue, and can be slow for very large queues. */
  obliterateQueue?: Maybe<JobCounts>;
  /**
   * Pause the queue.
   *
   * A PAUSED queue will not process new jobs until resumed, but current jobs being processed will continue until they are finalized.
   */
  pauseQueue: Queue;
  promoteJob: PromoteJobResult;
  refreshMetricData: Array<Maybe<RefreshMetricDataResult>>;
  /** Start tracking a queue */
  registerQueue: Queue;
  /** Resume a queue after being PAUSED. */
  resumeQueue: Queue;
  retryJob: RetryJobResult;
  retryJobs: RetryJobsPayload;
  /** Associate a JSON schema with a job name on a queue */
  setJobSchema: JobSchema;
  /** Trim the event stream to an approximately maxLength. */
  trimQueueEvents: Queue;
  /** Stop tracking a queue */
  unregisterQueue: UnregisterQueueResult;
  updateJob: UpdateJobResult;
  /** Update a job filter */
  updateJobFilter: UpdateJobFilterResult;
  updateMailNotificationChannel: MailNotificationChannel;
  /** Update a job metric */
  updateMetric: Metric;
  /** Update a rule */
  updateRule: Rule;
  updateSlackNotificationChannel: SlackNotificationChannel;
  updateWebhookNotificationChannel: WebhookNotificationChannel;
};

export type MutationDeleteRuleAlertArgs = {
  input: DeleteRuleAlertInput;
};

export type MutationActivateRuleArgs = {
  input: ActivateRuleInput;
};

export type MutationAddJobLogArgs = {
  id: Scalars['String'];
  queueId: Scalars['String'];
  row: Scalars['String'];
};

export type MutationBulkCreateJobsArgs = {
  jobs: Array<InputMaybe<BulkJobItemInput>>;
  queueId: Scalars['String'];
};

export type MutationBulkDeleteJobsArgs = {
  input: BulkJobActionInput;
};

export type MutationBulkPromoteJobsArgs = {
  input: BulkJobActionInput;
};

export type MutationBulkRetryJobsArgs = {
  input: BulkJobActionInput;
};

export type MutationChangeJobDelayArgs = {
  input?: InputMaybe<ChangeJobDelayInput>;
};

export type MutationCleanQueueArgs = {
  input: QueueCleanInput;
};

export type MutationClearRuleAlertsArgs = {
  input: ClesrRuleAlertsInput;
};

export type MutationCreateFlowArgs = {
  input?: InputMaybe<CreateFlowInput>;
};

export type MutationCreateJobArgs = {
  input?: InputMaybe<CreateJobInput>;
};

export type MutationCreateJobFilterArgs = {
  input: CreateJobFilterInput;
};

export type MutationCreateMailNotificationChannelArgs = {
  input: CreateMailNotificationChannelInput;
};

export type MutationCreateMetricArgs = {
  input: CreateMetricInput;
};

export type MutationCreateRepeatableJobArgs = {
  input?: InputMaybe<JobAddEveryInput>;
};

export type MutationCreateRepeatableJobByCronArgs = {
  input: CreateRepeatableJobByCronInput;
};

export type MutationCreateRuleArgs = {
  input: CreateRuleInput;
};

export type MutationCreateSlackNotificationChannelArgs = {
  input: SlackNotificationChannelAddInput;
};

export type MutationCreateWebhookNotificationChannelArgs = {
  input: CreateWebhookNotificationChannelInput;
};

export type MutationDeleteJobArgs = {
  input: JobLocatorInput;
};

export type MutationDeleteJobFilterArgs = {
  input: DeleteJobFilterInput;
};

export type MutationDeleteJobSchemaArgs = {
  input: DeleteJobSchemaInput;
};

export type MutationDeleteJobsByFilterArgs = {
  input: DeleteJobsByFilterInput;
};

export type MutationDeleteJobsByPatternArgs = {
  input: DeleteJobsByPatternInput;
};

export type MutationDeleteMetricArgs = {
  input: DeleteMetricInput;
};

export type MutationDeleteNotificationChannelArgs = {
  channelId: Scalars['ID'];
  hostId: Scalars['ID'];
};

export type MutationDeleteQueueArgs = {
  id: Scalars['ID'];
  options?: InputMaybe<DeleteQueueOptions>;
};

export type MutationDeleteQueueStatsArgs = {
  input: DeleteQueueStatsInput;
};

export type MutationDeleteRepeatableJobArgs = {
  id: Scalars['ID'];
  jobName?: InputMaybe<Scalars['String']>;
  repeat: DeleteRepeatableJobOptions;
};

export type MutationDeleteRepeatableJobByKeyArgs = {
  input: DeleteRepeatableJobByKeyInput;
};

export type MutationDeleteRuleArgs = {
  input: DeleteRuleInput;
};

export type MutationDisableNotificationChannelArgs = {
  channelId: Scalars['ID'];
  hostId: Scalars['ID'];
};

export type MutationDiscardJobArgs = {
  input: JobLocatorInput;
};

export type MutationDrainQueueArgs = {
  delayed?: InputMaybe<Scalars['Boolean']>;
  id: Scalars['ID'];
};

export type MutationEnableNotificationChannelArgs = {
  channelId: Scalars['ID'];
  hostId: Scalars['ID'];
};

export type MutationMarkRuleAlertAsReadArgs = {
  input: MarkRuleAlertAsReadInput;
};

export type MutationMoveJobToCompletedArgs = {
  input: JobLocatorInput;
};

export type MutationMoveJobToDelayedArgs = {
  input?: InputMaybe<MoveJobToDelayedInput>;
};

export type MutationMoveJobToFailedArgs = {
  input?: InputMaybe<MoveJobToFailedInput>;
};

export type MutationObliterateQueueArgs = {
  input?: InputMaybe<QueueObliterateInput>;
};

export type MutationPauseQueueArgs = {
  id: Scalars['ID'];
};

export type MutationPromoteJobArgs = {
  input: JobLocatorInput;
};

export type MutationRefreshMetricDataArgs = {
  input: RefreshMetricDataInput;
};

export type MutationRegisterQueueArgs = {
  input?: InputMaybe<RegisterQueueInput>;
};

export type MutationResumeQueueArgs = {
  id: Scalars['ID'];
};

export type MutationRetryJobArgs = {
  input: JobLocatorInput;
};

export type MutationRetryJobsArgs = {
  input: RetryJobsInput;
};

export type MutationSetJobSchemaArgs = {
  input: JobSchemaInput;
};

export type MutationTrimQueueEventsArgs = {
  id: Scalars['ID'];
  maxLength?: InputMaybe<Scalars['Int']>;
};

export type MutationUnregisterQueueArgs = {
  id: Scalars['ID'];
};

export type MutationUpdateJobArgs = {
  input: UpdateJobInput;
};

export type MutationUpdateJobFilterArgs = {
  input: UpdateJobFilterInput;
};

export type MutationUpdateMailNotificationChannelArgs = {
  input: UpdateMailNotificationChannelInput;
};

export type MutationUpdateMetricArgs = {
  input: MetricInput;
};

export type MutationUpdateRuleArgs = {
  input: RuleUpdateInput;
};

export type MutationUpdateSlackNotificationChannelArgs = {
  input: UpdateSlackNotificationChannelInput;
};

export type MutationUpdateWebhookNotificationChannelArgs = {
  input: UpdateWebhookNotificationChannelInput;
};

/** NotificationChannels provide a consistent ways for users to be notified about incidents. */
export type NotificationChannel = {
  /** Timestamp of channel creation */
  createdAt?: Maybe<Scalars['Date']>;
  /** Is the channel enabled ? */
  enabled: Scalars['Boolean'];
  id: Scalars['ID'];
  /** The name of the channel */
  name: Scalars['String'];
  /** The type of the channel, e.g. slack, email, webhook etc */
  type: Scalars['String'];
  /** Timestamp of last channel update */
  updatedAt?: Maybe<Scalars['Date']>;
};

export type OnJobAddedPayload = {
  __typename?: 'OnJobAddedPayload';
  jobId: Scalars['String'];
  jobName: Scalars['String'];
  queueId: Scalars['String'];
  queueName: Scalars['String'];
};

export type OnJobDelayedPayload = {
  __typename?: 'OnJobDelayedPayload';
  delay?: Maybe<Scalars['Int']>;
  job?: Maybe<Job>;
  jobId: Scalars['String'];
  queue: Queue;
};

export type OnJobLogAddedPayload = {
  __typename?: 'OnJobLogAddedPayload';
  /** The number of log lines after addition */
  count: Scalars['Int'];
  job: Job;
  jobId: Scalars['String'];
  queueId: Scalars['String'];
  /** The rows added to the job log */
  rows: Array<Scalars['String']>;
};

export type OnJobProgressPayload = {
  __typename?: 'OnJobProgressPayload';
  job: Job;
  progress?: Maybe<Scalars['JobProgress']>;
  queue: Queue;
};

export type OnJobRemovedPayload = {
  __typename?: 'OnJobRemovedPayload';
  jobId: Scalars['String'];
  queue: Queue;
};

export type OnJobStateChangePayload = {
  __typename?: 'OnJobStateChangePayload';
  job: Job;
  queue: Queue;
};

/** Holds the changes to the state of a job */
export type OnJobUpdatedPayload = {
  __typename?: 'OnJobUpdatedPayload';
  /** updates in job state since the last event */
  delta?: Maybe<Scalars['JSONObject']>;
  /** The event which triggered the update */
  event: Scalars['String'];
  job?: Maybe<Job>;
  /** The job's queue */
  queue: Queue;
  timestamp: Scalars['Date'];
};

export type OnNotificationChannelCreatedPayload = {
  __typename?: 'OnNotificationChannelCreatedPayload';
  channelId: Scalars['String'];
  channelName: Scalars['String'];
  channelType: Scalars['String'];
  hostId: Scalars['String'];
};

export type OnNotificationChannelDeletedPayload = {
  __typename?: 'OnNotificationChannelDeletedPayload';
  channelId: Scalars['String'];
  channelName: Scalars['String'];
  channelType: Scalars['String'];
  hostId: Scalars['String'];
};

export type OnQueueDeletedPayload = {
  __typename?: 'OnQueueDeletedPayload';
  /** The number of keys deleted */
  deletedKeys: Scalars['Int'];
  /** The queue host id */
  hostId: Scalars['String'];
  /** The id of the deleted queue */
  queueId: Scalars['String'];
  /** The name of the deleted queue */
  queueName: Scalars['String'];
};

export type OnQueueJobCountsChangedPayload = {
  __typename?: 'OnQueueJobCountsChangedPayload';
  delta?: Maybe<QueueJobCountDelta>;
  queueId: Scalars['String'];
};

export type OnQueueJobUpdatesPayload = {
  __typename?: 'OnQueueJobUpdatesPayload';
  changes: Array<JobUpdateDelta>;
  queueId: Scalars['String'];
};

/** Returns a stream of metric data updates */
export type OnQueueMetricValueUpdated = {
  __typename?: 'OnQueueMetricValueUpdated';
  queueId: Scalars['String'];
  /** The timestamp of the time the value was recorded */
  ts: Scalars['Date'];
  value: Scalars['Float'];
};

export type OnQueuePausedPayload = {
  __typename?: 'OnQueuePausedPayload';
  queueId: Scalars['String'];
};

export type OnQueueRegisteredPayload = {
  __typename?: 'OnQueueRegisteredPayload';
  hostId: Scalars['String'];
  prefix: Scalars['String'];
  queueId: Scalars['String'];
  queueName: Scalars['String'];
};

export type OnQueueResumedPayload = {
  __typename?: 'OnQueueResumedPayload';
  queueId: Scalars['String'];
};

export type OnQueueStateChangedPayload = {
  __typename?: 'OnQueueStateChangedPayload';
  queueId: Scalars['String'];
  queueName: Scalars['String'];
  state: Scalars['String'];
};

export type OnQueueUnregisteredPayload = {
  __typename?: 'OnQueueUnregisteredPayload';
  hostId: Scalars['String'];
  prefix: Scalars['String'];
  queueId: Scalars['String'];
  queueName: Scalars['String'];
};

/** Returns the list of added and removed workers related to a queue */
export type OnQueueWorkersChangedPayload = {
  __typename?: 'OnQueueWorkersChangedPayload';
  added: Array<QueueWorker>;
  queueId: Scalars['String'];
  removed: Array<QueueWorker>;
};

export type OnQueueWorkersCountPayload = {
  __typename?: 'OnQueueWorkersCountPayload';
  queueId: Scalars['String'];
  workersCount: Scalars['Int'];
};

export type OnRuleAlertPayload = {
  __typename?: 'OnRuleAlertPayload';
  alert: RuleAlert;
};

/** Method used for outlier detection */
export const OutlierDetectionMethod = {
  /** Detect outliers based on the Inter Quartile Range. */
  Iqr: 'IQR',
  /** Detect outliers based on Iglewicz and Hoaglin (Mean Absolute Deviation). */
  Mad: 'MAD',
  /** Detect outliers based on deviations from the mean. */
  Sigma: 'Sigma',
} as const;

export type OutlierDetectionMethod =
  typeof OutlierDetectionMethod[keyof typeof OutlierDetectionMethod];
/** Input parameters for outlier filtering */
export type OutlierFilterInput = {
  method: OutlierDetectionMethod;
  /** Optional detection threshold */
  threshold?: InputMaybe<Scalars['Float']>;
};

export type PeakConditionInput = {
  /** Signal if peak is above the threshold, below the threshold or either */
  direction: PeakSignalDirection;
  /** Standard deviations at which to trigger an error notification. */
  errorThreshold: Scalars['Float'];
  /** the influence (between 0 and 1) of new signals on the mean and standard deviation where 1 is normal influence, 0.5 is half */
  influence?: InputMaybe<Scalars['Float']>;
  /** The lag of the moving window (in milliseconds).  For example, a lag of 5000 will use the last 5 seconds of observationsto smooth the data. */
  lag?: InputMaybe<Scalars['Duration']>;
  /** The comparison operator */
  operator: RuleOperator;
  /** Standard deviations at which to trigger an warning notification. */
  warningThreshold?: InputMaybe<Scalars['Float']>;
};

export const PeakSignalDirection = {
  Above: 'ABOVE',
  Below: 'BELOW',
  Both: 'BOTH',
} as const;

export type PeakSignalDirection =
  typeof PeakSignalDirection[keyof typeof PeakSignalDirection];
export type PercentileCount = {
  __typename?: 'PercentileCount';
  count: Scalars['Int'];
  /** The percentile value */
  value: Scalars['Float'];
};

/** Percentile distribution of metric values */
export type PercentileDistribution = {
  __typename?: 'PercentileDistribution';
  /** The maximum value in the data range. */
  max: Scalars['Float'];
  /** The minimum value in the data range. */
  min: Scalars['Float'];
  percentiles: Array<PercentileCount>;
  /** The total number of values. */
  totalCount: Scalars['Int'];
};

/** Records histogram binning data */
export type PercentileDistributionInput = {
  /** Stats snapshot granularity */
  granularity: StatsGranularity;
  /** An optional job name to filter on */
  jobName?: InputMaybe<Scalars['String']>;
  /** The metric requested */
  metric?: InputMaybe<StatsMetricType>;
  /** The percentiles to get frequencies for */
  percentiles?: InputMaybe<Array<Scalars['Float']>>;
  /** An expression specifying the range to query e.g. yesterday, last_7days */
  range: Scalars['String'];
};

export type PingPayload = {
  __typename?: 'PingPayload';
  latency: Scalars['Int'];
};

export type PromoteJobResult = {
  __typename?: 'PromoteJobResult';
  job: Job;
  queue: Queue;
};

export type Query = {
  __typename?: 'Query';
  /** Get the list of aggregate types available for metrics */
  aggregates: Array<Maybe<AggregateInfo>>;
  /** Get general app info */
  appInfo: AppInfo;
  /** Get the list of available metric types */
  availableMetrics: Array<MetricInfo>;
  /** Returns the JSON Schema for the BullMq BulkJobOptions type */
  bulkJobOptionsSchema: Scalars['JSONSchema'];
  findJobs: FindJobsResult;
  /** Find a queue by name */
  findQueue?: Maybe<Queue>;
  /** Load a flow */
  flow?: Maybe<JobNode>;
  getJobs: Array<Job>;
  getJobsById: Array<Job>;
  /** Get a Host by id */
  host?: Maybe<QueueHost>;
  /** Get a Host by name */
  hostByName?: Maybe<QueueHost>;
  /** Get the list of hosts managed by the server instance */
  hosts: Array<QueueHost>;
  /** Infer a JSONSchema from completed jobs in a queue */
  inferJobSchema?: Maybe<JobSchema>;
  job: Job;
  /** Returns the JSON Schema for the BullMq JobOptions type */
  jobOptionsSchema: Scalars['JSONSchema'];
  /** Get a queue Metric by id */
  metric?: Maybe<Metric>;
  notificationChannel?: Maybe<NotificationChannel>;
  /** Get a queue by id */
  queue?: Maybe<Queue>;
  /** Get a queue JobFilter by id */
  queueJobFilter?: Maybe<JobFilter>;
  /** Get a JSONSchema document previously set for a job name on a queue */
  queueJobSchema?: Maybe<JobSchema>;
  rule?: Maybe<Rule>;
  ruleAlert?: Maybe<RuleAlert>;
  /** Validate job data against a schema previously defined on a queue */
  validateJobData: ValidateJobDataResult;
  /** Validate BullMQ job options structure */
  validateJobOptions: ValidateJobOptionsResult;
};

export type QueryFindJobsArgs = {
  input: FindJobsInput;
};

export type QueryFindQueueArgs = {
  hostName: Scalars['String'];
  prefix?: InputMaybe<Scalars['String']>;
  queueName: Scalars['String'];
};

export type QueryFlowArgs = {
  input: FlowNodeGetInput;
};

export type QueryGetJobsArgs = {
  input: GetJobsInput;
};

export type QueryGetJobsByIdArgs = {
  input: GetJobsByIdInput;
};

export type QueryHostArgs = {
  id: Scalars['ID'];
};

export type QueryHostByNameArgs = {
  name: Scalars['String'];
};

export type QueryInferJobSchemaArgs = {
  input?: InputMaybe<InferJobSchemaInput>;
};

export type QueryJobArgs = {
  id: Scalars['ID'];
  queueId: Scalars['ID'];
};

export type QueryMetricArgs = {
  metricId: Scalars['ID'];
  queueId: Scalars['ID'];
};

export type QueryNotificationChannelArgs = {
  hostId: Scalars['ID'];
  id: Scalars['ID'];
};

export type QueryQueueArgs = {
  id: Scalars['ID'];
};

export type QueryQueueJobFilterArgs = {
  input?: InputMaybe<QueueJobFilterInput>;
};

export type QueryQueueJobSchemaArgs = {
  input?: InputMaybe<QueueJobSchemaInput>;
};

export type QueryRuleArgs = {
  queueId: Scalars['ID'];
  ruleId: Scalars['ID'];
};

export type QueryRuleAlertArgs = {
  alertId: Scalars['ID'];
  queueId: Scalars['ID'];
  ruleId: Scalars['ID'];
};

export type QueryValidateJobDataArgs = {
  input: ValidateJobDataInput;
};

export type QueryValidateJobOptionsArgs = {
  input: JobOptionsInput;
};

export type Queue = {
  __typename?: 'Queue';
  /** Queue configuration */
  config?: Maybe<QueueConfig>;
  /** Returns the current default job options of the specified queue. */
  defaultJobOptions?: Maybe<JobOptions>;
  /** Gets the current job ErrorPercentage rates based on an exponential moving average */
  errorPercentageRate: Meter;
  /** Gets the current job Errors rates based on an exponential moving average */
  errorRate: Meter;
  /** Compute the histogram of job data. */
  histogram: HistogramPayload;
  host: Scalars['String'];
  hostId: Scalars['ID'];
  id: Scalars['String'];
  isPaused: Scalars['Boolean'];
  isReadonly: Scalars['Boolean'];
  jobCounts: JobCounts;
  /** Get the average runtime duration of completed jobs in the queue */
  jobDurationAvg: Scalars['Int'];
  jobFilters: Array<JobFilter>;
  /** Get the average memory used by jobs in the queue */
  jobMemoryAvg: Scalars['Float'];
  /** Get the average memory used by jobs in the queue */
  jobMemoryUsage: JobMemoryUsagePayload;
  jobNames: Array<Scalars['String']>;
  /** Get JSONSchema documents and job defaults previously set for a job names on a queue */
  jobSchemas: Array<JobSchema>;
  jobs: Array<Job>;
  /** Fetch jobs based on a filter expression or a previously stored filter */
  jobsByFilter: JobsByFilterPayload;
  jobsById: Array<Job>;
  /** Gets the last recorded queue stats snapshot for a metric */
  lastStatsSnapshot?: Maybe<StatsSnapshot>;
  limiter?: Maybe<QueueLimiter>;
  metricCount: Scalars['Int'];
  metrics: Array<Metric>;
  metricsData?: Maybe<MetricsTimeseries>;
  name: Scalars['String'];
  /** Returns the number of jobs waiting to be processed. */
  pendingJobCount: Scalars['Int'];
  /** Compute a percentile distribution. */
  percentileDistribution: PercentileDistribution;
  prefix: Scalars['String'];
  /** Returns the number of repeatable jobs */
  repeatableJobCount: Scalars['Int'];
  repeatableJobs: Array<RepeatableJob>;
  /** Returns the count of rule alerts associated with a Queue */
  ruleAlertCount: Scalars['Int'];
  /** Gets rule alerts associated with the queue */
  ruleAlerts: Array<RuleAlert>;
  rules: Array<Rule>;
  schedulerCount: Scalars['Int'];
  schedulers: Array<QueueScheduler>;
  /** Queries for queue stats snapshots within a range */
  stats: Array<StatsSnapshot>;
  /** Aggregates queue statistics within a range */
  statsAggregate?: Maybe<StatsSnapshot>;
  /** Gets the time range of recorded stats for a queue/host */
  statsDateRange?: Maybe<TimeSpan>;
  /** Gets the current job Throughput rates based on an exponential moving average */
  throughput: Meter;
  /** Get the average time a job spends in the queue before being processed */
  waitTimeAvg: Scalars['Int'];
  /** Returns the number of child jobs waiting to be processed. */
  waitingChildrenCount: Scalars['Int'];
  /** Returns the number of jobs waiting to be processed. */
  waitingCount: Scalars['Int'];
  workerCount: Scalars['Int'];
  workers: Array<QueueWorker>;
};

export type QueueErrorPercentageRateArgs = {
  input?: InputMaybe<StatsRateQueryInput>;
};

export type QueueErrorRateArgs = {
  input?: InputMaybe<StatsRateQueryInput>;
};

export type QueueHistogramArgs = {
  input: HistogramInput;
};

export type QueueJobDurationAvgArgs = {
  jobName?: InputMaybe<Scalars['String']>;
  limit?: InputMaybe<Scalars['Int']>;
};

export type QueueJobFiltersArgs = {
  ids?: InputMaybe<Array<Scalars['ID']>>;
};

export type QueueJobMemoryAvgArgs = {
  input?: InputMaybe<JobsMemoryAvgInput>;
};

export type QueueJobMemoryUsageArgs = {
  input?: InputMaybe<JobsMemoryAvgInput>;
};

export type QueueJobSchemasArgs = {
  jobNames?: InputMaybe<Array<Scalars['String']>>;
};

export type QueueJobsArgs = {
  input?: InputMaybe<QueueJobsInput>;
};

export type QueueJobsByFilterArgs = {
  input: JobsByFilterInput;
};

export type QueueJobsByIdArgs = {
  input?: InputMaybe<QueueJobsByIdInput>;
};

export type QueueLastStatsSnapshotArgs = {
  input?: InputMaybe<StatsLatestInput>;
};

export type QueueMetricsDataArgs = {
  input?: InputMaybe<MetricsDataInput>;
};

export type QueuePercentileDistributionArgs = {
  input: PercentileDistributionInput;
};

export type QueueRepeatableJobsArgs = {
  input?: InputMaybe<RepeatableJobsInput>;
};

export type QueueRuleAlertsArgs = {
  input?: InputMaybe<QueueRuleAlertsInput>;
};

export type QueueSchedulersArgs = {
  limit?: InputMaybe<Scalars['Int']>;
};

export type QueueStatsArgs = {
  input: StatsQueryInput;
};

export type QueueStatsAggregateArgs = {
  input: StatsQueryInput;
};

export type QueueStatsDateRangeArgs = {
  input: StatsSpanInput;
};

export type QueueThroughputArgs = {
  input?: InputMaybe<StatsRateQueryInput>;
};

export type QueueWaitTimeAvgArgs = {
  jobName?: InputMaybe<Scalars['String']>;
  limit?: InputMaybe<Scalars['Int']>;
};

export type QueueWorkersArgs = {
  limit?: InputMaybe<Scalars['Int']>;
};

export type QueueCleanInput = {
  /** Grace period interval (ms). Jobs older this this will be removed. */
  grace?: InputMaybe<Scalars['Duration']>;
  id: Scalars['ID'];
  /** limit Maximum amount of jobs to clean per call. If not provided will clean all matching jobs. */
  limit?: InputMaybe<Scalars['Int']>;
  /** Status of the jobs to clean */
  status?: InputMaybe<CleanQueueJobType>;
};

export type QueueCleanResult = {
  __typename?: 'QueueCleanResult';
  /** Returns the number of affected jobs */
  count: Scalars['Int'];
  /** The queue id */
  id: Scalars['ID'];
  /** Returns a list of cleared job ids */
  jobIds?: Maybe<Array<Scalars['ID']>>;
};

/** Queue configuration */
export type QueueConfig = {
  __typename?: 'QueueConfig';
  /** returns true if the jobs can be retried */
  allowRetries: Scalars['Boolean'];
  /** the queue id */
  id: Scalars['ID'];
  /** returns true if the queue is readonly */
  isReadonly: Scalars['Boolean'];
  /** the queue name */
  name: Scalars['String'];
  /** the queue prefix */
  prefix?: Maybe<Scalars['String']>;
};

export const QueueFilterStatus = {
  Active: 'Active',
  Inactive: 'Inactive',
  Paused: 'Paused',
  Running: 'Running',
} as const;

export type QueueFilterStatus =
  typeof QueueFilterStatus[keyof typeof QueueFilterStatus];
export type QueueHost = {
  __typename?: 'QueueHost';
  /** Returns the number of alerts raised across all the queues associated with this host */
  alertCount: Scalars['Int'];
  /** Notification channels for alerts */
  channels: Array<NotificationChannel>;
  /** An optional description of the host */
  description?: Maybe<Scalars['String']>;
  /** Discover Bull queues on the given host */
  discoverQueues: Array<DiscoverQueuesPayload>;
  /** Gets the current job ErrorPercentage rates for a host based on an exponential moving average */
  errorPercentageRate: Meter;
  /** Gets the current job Errors rates for a host based on an exponential moving average */
  errorRate: Meter;
  /** Compute the histogram of job data. */
  histogram: HistogramPayload;
  id: Scalars['ID'];
  /** Get job counts for a host */
  jobCounts: JobCounts;
  /** Gets the last recorded queue stats snapshot for a metric */
  lastStatsSnapshot?: Maybe<StatsSnapshot>;
  /** The name of the host */
  name: Scalars['String'];
  /** Compute a percentile distribution. */
  percentileDistribution: PercentileDistribution;
  ping: PingPayload;
  /** The count of queues registered for this host */
  queueCount: Scalars['Int'];
  /** The queues registered for this host */
  queues: Array<Queue>;
  redis: RedisInfo;
  /** Queries for queue stats snapshots within a range */
  stats: Array<StatsSnapshot>;
  /** Aggregates queue statistics within a range */
  statsAggregate?: Maybe<StatsSnapshot>;
  /** Gets the time range of recorded stats for a queue/host */
  statsDateRange?: Maybe<TimeSpan>;
  /** Gets the current job Throughput rates for a host based on an exponential moving average */
  throughput: Meter;
  uri: Scalars['String'];
  /** Returns the number of workers associated with managed queues on this host */
  workerCount: Scalars['Int'];
  workers: Array<QueueWorker>;
};

export type QueueHostDiscoverQueuesArgs = {
  prefix?: InputMaybe<Scalars['String']>;
  unregisteredOnly?: InputMaybe<Scalars['Boolean']>;
};

export type QueueHostErrorPercentageRateArgs = {
  input?: InputMaybe<StatsRateQueryInput>;
};

export type QueueHostErrorRateArgs = {
  input?: InputMaybe<StatsRateQueryInput>;
};

export type QueueHostHistogramArgs = {
  input: HistogramInput;
};

export type QueueHostLastStatsSnapshotArgs = {
  input?: InputMaybe<StatsLatestInput>;
};

export type QueueHostPercentileDistributionArgs = {
  input: PercentileDistributionInput;
};

export type QueueHostQueuesArgs = {
  filter?: InputMaybe<HostQueuesFilter>;
};

export type QueueHostStatsArgs = {
  input: StatsQueryInput;
};

export type QueueHostStatsAggregateArgs = {
  input: StatsQueryInput;
};

export type QueueHostStatsDateRangeArgs = {
  input: StatsSpanInput;
};

export type QueueHostThroughputArgs = {
  input?: InputMaybe<StatsRateQueryInput>;
};

export type QueueHostWorkersArgs = {
  limit?: InputMaybe<Scalars['Int']>;
};

export type QueueJobCountDelta = {
  __typename?: 'QueueJobCountDelta';
  active?: Maybe<Scalars['Int']>;
  completed?: Maybe<Scalars['Int']>;
  delayed?: Maybe<Scalars['Int']>;
  failed?: Maybe<Scalars['Int']>;
  waiting?: Maybe<Scalars['Int']>;
};

export type QueueJobFilterInput = {
  fieldId: Scalars['ID'];
  queueId: Scalars['ID'];
};

export type QueueJobSchemaInput = {
  jobName: Scalars['String'];
  queueId: Scalars['ID'];
};

export type QueueJobUpdatesFilterInput = {
  /** The job names to filter for */
  names?: InputMaybe<Array<Scalars['String']>>;
  queueId: Scalars['ID'];
  /** Only return updates for jobs with these states */
  states?: InputMaybe<Array<InputMaybe<JobType>>>;
};

export type QueueJobsByIdInput = {
  ids: Array<Scalars['ID']>;
};

export type QueueJobsInput = {
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  sortOrder?: InputMaybe<SortOrderEnum>;
  status?: InputMaybe<JobSearchStatus>;
};

export type QueueLimiter = {
  __typename?: 'QueueLimiter';
  /**
   * The duration of the limiter in milliseconds.
   * During this time, a maximum of "max" jobs will be processed.
   */
  duration?: Maybe<Scalars['Int']>;
  /** The group key to be used by the limiter when limiting by group keys. */
  groupKey?: Maybe<Scalars['String']>;
  /** The maximum number of jobs that can be processed during the period specified by "duration". */
  max?: Maybe<Scalars['Int']>;
};

export type QueueObliterateInput = {
  /** The maximum number of deleted keys per iteration. */
  count?: InputMaybe<Scalars['Int']>;
  /** Use force = true to force obliteration even with active jobs in the queue. */
  force?: InputMaybe<Scalars['Boolean']>;
  id: Scalars['ID'];
};

/** Options for retrieving queue rule alerts */
export type QueueRuleAlertsInput = {
  /** Consider alerts ending on or before this date */
  endDate?: InputMaybe<Scalars['Date']>;
  /** The maximum number of alerts to return */
  limit: Scalars['Int'];
  /** The sort order of the results. Alerts are sorted by creation date. */
  sortOrder?: InputMaybe<SortOrderEnum>;
  /** Consider alerts starting on or after this date */
  startDate?: InputMaybe<Scalars['Date']>;
};

export type QueueScheduler = {
  __typename?: 'QueueScheduler';
  /** address of the client */
  addr: Scalars['String'];
  /** total duration of the connection (in seconds) */
  age: Scalars['Int'];
  /** the current database number */
  db: Scalars['Int'];
  id?: Maybe<Scalars['String']>;
  /** Idle time of the connection (in seconds) */
  idle: Scalars['Int'];
  multi: Scalars['Int'];
  name?: Maybe<Scalars['String']>;
  obl: Scalars['Int'];
  oll: Scalars['Int'];
  omem: Scalars['Int'];
  qbuf: Scalars['Int'];
  qbufFree: Scalars['Int'];
  role?: Maybe<Scalars['String']>;
  /** Date/time when the connection started */
  started?: Maybe<Scalars['DateTime']>;
  sub: Scalars['Int'];
};

export type QueueWorker = {
  __typename?: 'QueueWorker';
  /** address of the client */
  addr: Scalars['String'];
  /** total duration of the connection (in seconds) */
  age: Scalars['Int'];
  /** the current database number */
  db: Scalars['Int'];
  id?: Maybe<Scalars['String']>;
  /** Idle time of the connection (in seconds) */
  idle: Scalars['Int'];
  multi: Scalars['Int'];
  name?: Maybe<Scalars['String']>;
  obl: Scalars['Int'];
  oll: Scalars['Int'];
  omem: Scalars['Int'];
  qbuf: Scalars['Int'];
  qbufFree: Scalars['Int'];
  role?: Maybe<Scalars['String']>;
  /** Date/time when the connection started */
  started?: Maybe<Scalars['DateTime']>;
  sub: Scalars['Int'];
};

export type RedisInfo = {
  __typename?: 'RedisInfo';
  blocked_clients: Scalars['Int'];
  connected_clients: Scalars['Int'];
  instantaneous_ops_per_sec: Scalars['Int'];
  maxmemory: Scalars['Int'];
  mem_fragmentation_ratio?: Maybe<Scalars['Float']>;
  number_of_cached_scripts: Scalars['Int'];
  os: Scalars['String'];
  redis_mode: Scalars['String'];
  redis_version: Scalars['String'];
  role: Scalars['String'];
  tcp_port: Scalars['Int'];
  total_system_memory: Scalars['Int'];
  total_system_memory_human: Scalars['String'];
  uptime_in_days: Scalars['Int'];
  uptime_in_seconds: Scalars['Int'];
  used_cpu_sys: Scalars['Float'];
  used_memory: Scalars['Int'];
  used_memory_human: Scalars['String'];
  used_memory_lua: Scalars['Int'];
  used_memory_peak: Scalars['Int'];
  used_memory_peak_human: Scalars['String'];
};

export type RefreshMetricDataInput = {
  end?: InputMaybe<Scalars['Date']>;
  metricId: Scalars['String'];
  /** An expression specifying the range to query e.g. yesterday, last_7days */
  range?: InputMaybe<Scalars['String']>;
  start?: InputMaybe<Scalars['Date']>;
};

export type RefreshMetricDataResult = {
  __typename?: 'RefreshMetricDataResult';
  end?: Maybe<Scalars['Date']>;
  metric: Metric;
  metricId: Scalars['String'];
  start?: Maybe<Scalars['Date']>;
};

export type RegisterQueueInput = {
  checkExists?: InputMaybe<Scalars['Boolean']>;
  hostId: Scalars['ID'];
  /** the queue names */
  name: Scalars['String'];
  prefix?: InputMaybe<Scalars['String']>;
  trackMetrics?: InputMaybe<Scalars['Boolean']>;
};

export type RepeatableJob = {
  __typename?: 'RepeatableJob';
  cron?: Maybe<Scalars['String']>;
  /** Human readable description of the cron expression */
  descr?: Maybe<Scalars['String']>;
  /** Date when the repeat job should stop repeating (only with cron). */
  endDate?: Maybe<Scalars['Date']>;
  id?: Maybe<Scalars['String']>;
  key: Scalars['String'];
  name?: Maybe<Scalars['String']>;
  next?: Maybe<Scalars['Date']>;
  /** The timezone for the job */
  tz?: Maybe<Scalars['String']>;
};

export type RepeatableJobsInput = {
  limit?: InputMaybe<Scalars['Int']>;
  offset?: InputMaybe<Scalars['Int']>;
  order?: InputMaybe<SortOrderEnum>;
};

export type RetryJobResult = {
  __typename?: 'RetryJobResult';
  job: Job;
  queue: Queue;
};

export type RetryJobsInput = {
  /** number to limit how many jobs will be moved to wait status per iteration */
  count?: InputMaybe<Scalars['Int']>;
  /** The id of the queue */
  queueId: Scalars['ID'];
  /** Job status to consider. Defaults to failed. */
  state?: InputMaybe<FinishedStatus>;
  /** retry all failed jobs before the given timestamp */
  timestamp?: InputMaybe<Scalars['Int']>;
};

export type RetryJobsPayload = {
  __typename?: 'RetryJobsPayload';
  /** the number of retried jobs */
  count?: Maybe<Scalars['Int']>;
};

export type Rule = {
  __typename?: 'Rule';
  /** The current count of alerts available for this rule */
  alertCount: Scalars['Int'];
  alerts: Array<Maybe<RuleAlert>>;
  /** Rule notification channels */
  channels: Array<NotificationChannel>;
  condition: RuleConditionInterface;
  /** The rule creation timestamp */
  createdAt: Scalars['Date'];
  /** A helpful description of the rule */
  description?: Maybe<Scalars['String']>;
  /** The rule id */
  id: Scalars['ID'];
  /** Is this rule active or not */
  isActive: Scalars['Boolean'];
  /** The last time the rule was triggered */
  lastTriggeredAt?: Maybe<Scalars['Date']>;
  /** Optional text for message when an alert is raised. Markdown and handlebars supported */
  message?: Maybe<Scalars['String']>;
  /** The metric being monitored */
  metric?: Maybe<Metric>;
  /** The names of the rule */
  name: Scalars['String'];
  /** Options controlling the generation of events */
  options?: Maybe<RuleAlertOptions>;
  /** Optional data passed on to alerts */
  payload?: Maybe<Scalars['JSONObject']>;
  /** The id of the queue to which the rule belongs */
  queueId: Scalars['ID'];
  severity?: Maybe<Severity>;
  /** The current rule states */
  state?: Maybe<RuleState>;
  status: RuleStatus;
  /** The total number of failures */
  totalFailures: Scalars['Int'];
  /** The timestamp of last update */
  updatedAt: Scalars['Date'];
};

export type RuleAlertsArgs = {
  input?: InputMaybe<RuleAlertsInput>;
};

/** An event recording the occurrence of an rule violation or reset */
export type RuleAlert = {
  __typename?: 'RuleAlert';
  /** Error level */
  errorLevel?: Maybe<ErrorLevel>;
  /** The number of failures before this alert was generated */
  failures: Scalars['Int'];
  id: Scalars['ID'];
  /** Has the alert been read or not */
  isRead: Scalars['Boolean'];
  message?: Maybe<Scalars['String']>;
  /** Optional rule specific data. Corresponds to Rule.payload */
  payload?: Maybe<Scalars['JSONObject']>;
  /** Timestamp of when this alert was raised */
  raisedAt: Scalars['DateTime'];
  /** Timestamp of when this alert was reset */
  resetAt?: Maybe<Scalars['DateTime']>;
  /** The id of the rule that raised this alert */
  ruleId: Scalars['String'];
  /** A categorization of the severity of the rule type */
  severity?: Maybe<Severity>;
  /** State that triggered alert */
  state: RuleEvaluationState;
  status: Scalars['String'];
  title?: Maybe<Scalars['String']>;
  /** The metric value that crossed the threshold. */
  value: Scalars['Float'];
};

/** Options for raising alerts for a Rule */
export type RuleAlertOptions = {
  __typename?: 'RuleAlertOptions';
  /** Raise an alert after an event trigger when the situation returns to normal */
  alertOnReset?: Maybe<Scalars['Boolean']>;
  /** The minimum number of violations before an alert can be raised */
  failureThreshold?: Maybe<Scalars['Int']>;
  /**
   * The max number of alerts to receive per event trigger in case the condition is met.
   *  In this case the "event" is a single period between the rule VIOLATION and RESET states.
   */
  maxAlertsPerEvent?: Maybe<Scalars['Int']>;
  /** If specified, the minimum time between alerts for the same incident */
  notifyInterval?: Maybe<Scalars['Duration']>;
  /** How long an triggered rule must be without failures before resetting it to NORMAL. In conjunction with "alertOnReset", this can be used to prevent a possible storm of notifications when a rule condition passes and fails in rapid succession ("flapping") */
  recoveryWindow?: Maybe<Scalars['Duration']>;
  /** Optional number of consecutive successful method executions to close then alert. Default 1 */
  successThreshold?: Maybe<Scalars['Int']>;
  /** Wait a certain duration between first encountering a failure and triggering an alert */
  triggerDelay?: Maybe<Scalars['Duration']>;
};

export type RuleAlertOptionsInput = {
  /** Raise an alert after an event trigger when the situation returns to normal */
  alertOnReset?: InputMaybe<Scalars['Boolean']>;
  /** The minimum number of violations before an alert can be raised */
  failureThreshold?: InputMaybe<Scalars['Int']>;
  /**
   * The max number of alerts to receive per event trigger in case the condition is met.
   *  In this case the "event" is a single period between the rule VIOLATION and RESET states.
   */
  maxAlertsPerEvent?: InputMaybe<Scalars['Int']>;
  /** If specified, the minimum time between alerts for the same incident */
  notifyInterval?: InputMaybe<Scalars['Duration']>;
  /** How long an triggered rule must be without failures before resetting it to NORMAL. In conjunction with "alertOnReset", this can be used to prevent a possible storm of notifications when a rule condition passes and fails in rapid succession ("flapping") */
  recoveryWindow?: InputMaybe<Scalars['Duration']>;
  /** Optional number of consecutive successful method executions to close then alert. Default 1 */
  successThreshold?: InputMaybe<Scalars['Int']>;
  /** Wait a certain duration between first encountering a failure and triggering an alert */
  triggerDelay?: InputMaybe<Scalars['Duration']>;
};

export type RuleAlertsInput = {
  end?: InputMaybe<Scalars['Int']>;
  sortOrder?: InputMaybe<SortOrderEnum>;
  start?: InputMaybe<Scalars['Int']>;
};

export const RuleCircuitState = {
  Closed: 'CLOSED',
  HalfOpen: 'HALF_OPEN',
  Open: 'OPEN',
} as const;

export type RuleCircuitState =
  typeof RuleCircuitState[keyof typeof RuleCircuitState];
export type RuleConditionInput = {
  changeCondition?: InputMaybe<ChangeConditionInput>;
  peakCondition?: InputMaybe<PeakConditionInput>;
  thresholdCondition?: InputMaybe<ThresholdConditionInput>;
  type: RuleType;
};

/** Describes a queue condition were monitoring. */
export type RuleConditionInterface = {
  /** The value needed to trigger an error notification */
  errorThreshold: Scalars['Float'];
  /** The comparison operator */
  operator: RuleOperator;
  /** The value needed to trigger an warning notification */
  warningThreshold?: Maybe<Scalars['Float']>;
};

/** Describes the state value from a rule evaluation. */
export type RuleEvaluationState = {
  /** The rule operator */
  comparator: RuleOperator;
  errorLevel: ErrorLevel;
  /** The error threshold of the rule */
  errorThreshold: Scalars['Float'];
  /** The type of rule */
  ruleType: RuleType;
  unit: Scalars['String'];
  /** The value which triggered the alert */
  value: Scalars['Float'];
  /** The warning threshold of the rule */
  warningThreshold?: Maybe<Scalars['Float']>;
};

export const RuleOperator = {
  Eq: 'EQ',
  Gt: 'GT',
  Gte: 'GTE',
  Lt: 'LT',
  Lte: 'LTE',
  Ne: 'NE',
} as const;

export type RuleOperator = typeof RuleOperator[keyof typeof RuleOperator];
export const RuleState = {
  Error: 'ERROR',
  Muted: 'MUTED',
  Normal: 'NORMAL',
  Warning: 'WARNING',
} as const;

export type RuleState = typeof RuleState[keyof typeof RuleState];
/** Real time status of a Rule */
export type RuleStatus = {
  __typename?: 'RuleStatus';
  /** The number of alerts raised for the current failure event (between trigger and close) */
  alertCount: Scalars['Int'];
  /** Circuit breaker state. */
  circuitState?: Maybe<RuleCircuitState>;
  /** The number of failures for the current event (from trigger to close) */
  failures: Scalars['Int'];
  /** The last time the rule triggered */
  lastFailure?: Maybe<Scalars['Date']>;
  /** The last time a notification was sent */
  lastNotification?: Maybe<Scalars['Date']>;
  /** The rule state. */
  state?: Maybe<RuleState>;
  /** The number of successful rule invocations after an alert has triggered. */
  successes: Scalars['Int'];
  /** The total number of failures in the lifetime of the rule */
  totalFailures: Scalars['Int'];
};

export const RuleType = {
  Change: 'CHANGE',
  Peak: 'PEAK',
  Threshold: 'THRESHOLD',
} as const;

export type RuleType = typeof RuleType[keyof typeof RuleType];
/** Information needed to update a rule */
export type RuleUpdateInput = {
  /** Notification channel ids */
  channels?: InputMaybe<Array<Scalars['String']>>;
  /** The rule condition */
  condition: RuleConditionInput;
  /** A helpful description of the rule */
  description?: InputMaybe<Scalars['String']>;
  /** The id of the the rule to update */
  id: Scalars['ID'];
  /** Is this rule active or not */
  isActive?: InputMaybe<Scalars['Boolean']>;
  /** Optional text for message when an alert is raised. Markdown and handlebars supported */
  message?: InputMaybe<Scalars['String']>;
  /** The id of the metric being monitored */
  metricId?: InputMaybe<Scalars['String']>;
  /** The names of the rule */
  name?: InputMaybe<Scalars['String']>;
  /** Options controlling the generation of events */
  options?: InputMaybe<RuleAlertOptionsInput>;
  /** Optional data passed on to alerts */
  payload?: InputMaybe<Scalars['JSONObject']>;
  /** The id of the queue to which the rule belongs */
  queueId: Scalars['ID'];
  severity?: InputMaybe<Severity>;
};

export const Severity = {
  Critical: 'CRITICAL',
  Error: 'ERROR',
  Info: 'INFO',
  Warning: 'WARNING',
} as const;

export type Severity = typeof Severity[keyof typeof Severity];
/** A channel which sends notifications through slack */
export type SlackNotificationChannel = NotificationChannel & {
  __typename?: 'SlackNotificationChannel';
  /** The slack webhook to post messages to */
  channel?: Maybe<Scalars['String']>;
  /** Timestamp of channel creation */
  createdAt?: Maybe<Scalars['Date']>;
  /** Is the channel enabled ? */
  enabled: Scalars['Boolean'];
  id: Scalars['ID'];
  /** The name of the channel */
  name: Scalars['String'];
  /** A valid slack auth token. Not needed if a webhook is specified */
  token?: Maybe<Scalars['String']>;
  /** The type of the channel, e.g. slack, email, webhook etc */
  type: Scalars['String'];
  /** Timestamp of last channel update */
  updatedAt?: Maybe<Scalars['Date']>;
  /** The slack webhook to post messages to */
  webhook: Scalars['URL'];
};

export type SlackNotificationChannelAddInput = {
  channel: SlackNotificationChannelUpdate;
  hostId: Scalars['ID'];
};

export type SlackNotificationChannelUpdate = {
  /** The slack webhook to post messages to */
  channel?: InputMaybe<Scalars['String']>;
  /** Is the channel enabled ? */
  enabled: Scalars['Boolean'];
  /** The name of the channel */
  name: Scalars['String'];
  /** A valid slack auth token. Not needed if a webhook is specified */
  token?: InputMaybe<Scalars['String']>;
  /** The type of the channel, e.g. slack, email, webhook etc */
  type: Scalars['String'];
  /** The slack webhook to post messages to */
  webhook: Scalars['URL'];
};

export const SortOrderEnum = {
  Asc: 'ASC',
  Desc: 'DESC',
} as const;

export type SortOrderEnum = typeof SortOrderEnum[keyof typeof SortOrderEnum];
export const StatsGranularity = {
  Day: 'Day',
  Hour: 'Hour',
  Minute: 'Minute',
  Month: 'Month',
  Week: 'Week',
} as const;

export type StatsGranularity =
  typeof StatsGranularity[keyof typeof StatsGranularity];
/** Queue stats filter to getting latest snapshot. */
export type StatsLatestInput = {
  /** Stats snapshot granularity */
  granularity?: InputMaybe<StatsGranularity>;
  /** An optional job name to filter on */
  jobName?: InputMaybe<Scalars['String']>;
  /** The metric requested */
  metric?: InputMaybe<StatsMetricType>;
};

export const StatsMetricType = {
  Latency: 'Latency',
  Wait: 'Wait',
} as const;

export type StatsMetricType =
  typeof StatsMetricType[keyof typeof StatsMetricType];
/** Queue stats filter. */
export type StatsQueryInput = {
  /** Stats snapshot granularity */
  granularity: StatsGranularity;
  /** An optional job name to filter on */
  jobName?: InputMaybe<Scalars['String']>;
  /** The metric requested */
  metric?: InputMaybe<StatsMetricType>;
  /** An expression specifying the range to query e.g. yesterday, last_7days */
  range: Scalars['String'];
};

/** Queue stats rates filter. */
export type StatsRateQueryInput = {
  /** Stats snapshot granularity */
  granularity: StatsGranularity;
  /** An optional job name to filter on */
  jobName?: InputMaybe<Scalars['String']>;
  /** An expression specifying the range to query e.g. yesterday, last_7days */
  range: Scalars['String'];
};

/** Queue job stats snapshot. */
export type StatsSnapshot = JobStatsInterface & {
  __typename?: 'StatsSnapshot';
  /** The number of completed jobs in the sample interval */
  completed: Scalars['Int'];
  /** The sample size */
  count: Scalars['Int'];
  /** The end of the interval */
  endTime: Scalars['Date'];
  /** The number of failed jobs in the sample interval */
  failed: Scalars['Int'];
  /** One minute exponentially weighted moving average */
  m1Rate: Scalars['Float'];
  /** Five minute exponentially weighted moving average */
  m5Rate: Scalars['Float'];
  /** Fifteen minute exponentially weighted moving average */
  m15Rate: Scalars['Float'];
  /** The maximum value in the data set */
  max: Scalars['Float'];
  /** The average of values during the period */
  mean: Scalars['Float'];
  /** The average rate of events over the entire lifetime of measurement (e.g., the total number of requests handled,divided by the number of seconds the process has been running), it doesn’t offer a sense of recency. */
  meanRate: Scalars['Float'];
  /** The median value of the data set */
  median: Scalars['Float'];
  /** The minimum value in the data set */
  min: Scalars['Float'];
  /** The 25th percentile */
  p90: Scalars['Float'];
  /** The 95th percentile */
  p95: Scalars['Float'];
  /** The 99th percentile */
  p99: Scalars['Float'];
  /** The 99.5th percentile */
  p995: Scalars['Float'];
  /** The start of the interval */
  startTime: Scalars['Date'];
  /** The standard deviation of the dataset over the sample period */
  stddev: Scalars['Float'];
};

export type StatsSpanInput = {
  granularity?: InputMaybe<StatsGranularity>;
  /** The host/queue to query */
  id: Scalars['ID'];
  jobName?: InputMaybe<Scalars['String']>;
};

/** Filtering options for stats subscriptions. */
export type StatsUpdatedSubscriptionFilter = {
  /** Data granularity */
  granularity?: InputMaybe<StatsGranularity>;
  /** The id of the queue or host to subscribe to */
  id: Scalars['ID'];
  /** An optional job name for filtering */
  jobName?: InputMaybe<Scalars['String']>;
  /** The metric requested */
  metric?: InputMaybe<StatsMetricType>;
};

export type Subscription = {
  __typename?: 'Subscription';
  /** Returns job active events */
  obJobActive?: Maybe<OnJobStateChangePayload>;
  /** Returns job completed events */
  obJobCompleted?: Maybe<OnJobStateChangePayload>;
  /** Returns job failed events */
  obJobFailed?: Maybe<OnJobStateChangePayload>;
  /** Subscribe for updates in host statistical snapshots */
  onHostStatsUpdated: StatsSnapshot;
  onJobAdded: OnJobAddedPayload;
  onJobDelayed: OnJobDelayedPayload;
  onJobLogAdded: OnJobLogAddedPayload;
  onJobProgress: OnJobProgressPayload;
  onJobRemoved: OnJobRemovedPayload;
  onJobUpdated: OnJobUpdatedPayload;
  onNotificationChannelCreated: OnNotificationChannelCreatedPayload;
  onNotificationChannelDeleted: OnNotificationChannelDeletedPayload;
  onQueueDeleted: OnQueueDeletedPayload;
  onQueueJobCountsChanged: OnQueueJobCountsChangedPayload;
  onQueueJobUpdates: OnQueueJobUpdatesPayload;
  onQueueMetricValueUpdated: OnQueueMetricValueUpdated;
  onQueuePaused: OnQueuePausedPayload;
  onQueueRegistered: OnQueueRegisteredPayload;
  onQueueResumed: OnQueueResumedPayload;
  onQueueStateChanged: OnQueueStateChangedPayload;
  /** Subscribe for updates in queue statistical snapshots */
  onQueueStatsUpdated: StatsSnapshot;
  onQueueUnregistered: OnQueueUnregisteredPayload;
  onQueueWorkersChanged: OnQueueWorkersChangedPayload;
  /** Returns an updated count of workers assigned to a queue */
  onQueueWorkersCountChanged: OnQueueWorkersCountPayload;
  onRuleAlert: OnRuleAlertPayload;
};

export type SubscriptionObJobActiveArgs = {
  jobId: Scalars['String'];
  queueId: Scalars['String'];
};

export type SubscriptionObJobCompletedArgs = {
  jobId: Scalars['String'];
  queueId: Scalars['String'];
};

export type SubscriptionObJobFailedArgs = {
  jobId: Scalars['String'];
  queueId: Scalars['String'];
};

export type SubscriptionOnHostStatsUpdatedArgs = {
  input: StatsUpdatedSubscriptionFilter;
};

export type SubscriptionOnJobAddedArgs = {
  queueId: Scalars['ID'];
};

export type SubscriptionOnJobDelayedArgs = {
  prefix?: Scalars['String'];
  queueId: Scalars['ID'];
};

export type SubscriptionOnJobLogAddedArgs = {
  jobId: Scalars['String'];
  queueId: Scalars['String'];
};

export type SubscriptionOnJobProgressArgs = {
  jobId: Scalars['String'];
  queueId: Scalars['String'];
};

export type SubscriptionOnJobRemovedArgs = {
  jobId: Scalars['String'];
  queueId: Scalars['String'];
};

export type SubscriptionOnJobUpdatedArgs = {
  jobId: Scalars['String'];
  queueId: Scalars['String'];
};

export type SubscriptionOnNotificationChannelCreatedArgs = {
  hostId: Scalars['String'];
};

export type SubscriptionOnNotificationChannelDeletedArgs = {
  hostId: Scalars['String'];
};

export type SubscriptionOnQueueDeletedArgs = {
  hostId: Scalars['String'];
};

export type SubscriptionOnQueueJobCountsChangedArgs = {
  queueId: Scalars['String'];
};

export type SubscriptionOnQueueJobUpdatesArgs = {
  input: QueueJobUpdatesFilterInput;
};

export type SubscriptionOnQueueMetricValueUpdatedArgs = {
  metricId: Scalars['String'];
  queueId: Scalars['String'];
};

export type SubscriptionOnQueuePausedArgs = {
  queueId: Scalars['String'];
};

export type SubscriptionOnQueueRegisteredArgs = {
  hostId: Scalars['String'];
};

export type SubscriptionOnQueueResumedArgs = {
  queueId: Scalars['ID'];
};

export type SubscriptionOnQueueStateChangedArgs = {
  queueId: Scalars['String'];
};

export type SubscriptionOnQueueStatsUpdatedArgs = {
  input: StatsUpdatedSubscriptionFilter;
};

export type SubscriptionOnQueueUnregisteredArgs = {
  hostId: Scalars['String'];
};

export type SubscriptionOnQueueWorkersChangedArgs = {
  queueId: Scalars['String'];
};

export type SubscriptionOnQueueWorkersCountChangedArgs = {
  queueId: Scalars['String'];
};

export type SubscriptionOnRuleAlertArgs = {
  queueId: Scalars['ID'];
  ruleIds?: InputMaybe<Array<Scalars['String']>>;
};

/** Basic descriptive statistics */
export type SummaryStatistics = {
  __typename?: 'SummaryStatistics';
  /** The number of input values included in calculations */
  count: Scalars['Int'];
  /** The maximum value. */
  max?: Maybe<Scalars['Float']>;
  /** The average value - the sum of all values over the number of values. */
  mean: Scalars['Float'];
  /** The median is the middle number of a list. This is often a good indicator of "the middle" when there are outliers that skew the mean value. */
  median?: Maybe<Scalars['Float']>;
  /** The minimum value. */
  min?: Maybe<Scalars['Float']>;
  /** The standard deviation is the square root of the sample variance. */
  sampleStandardDeviation: Scalars['Float'];
  /**
   * The sample variance is the sum of squared deviations from the mean.
   * The sample variance is distinguished from the variance by dividing the sum of squared deviations by (n - 1) instead of n. This corrects the bias in estimating a value from a sample set rather than the full population.
   */
  sampleVariance: Scalars['Float'];
  /** The standard deviation is the square root of the variance. This is also known as the population standard deviation. It is useful for measuring the amount of variation or dispersion in a set of values. */
  standardDeviation: Scalars['Float'];
  /** The variance is the sum of squared deviations from the mean. */
  variance: Scalars['Float'];
};

export type ThresholdConditionInput = {
  /** The value needed to trigger an error notification */
  errorThreshold: Scalars['Float'];
  /** The comparison operator */
  operator: RuleOperator;
  /** The value needed to trigger an warning notification */
  warningThreshold?: InputMaybe<Scalars['Float']>;
};

export type TimeSpan = {
  __typename?: 'TimeSpan';
  endTime: Scalars['DateTime'];
  startTime: Scalars['DateTime'];
};

export type TimeseriesDataPoint = TimeseriesDataPointInterface & {
  __typename?: 'TimeseriesDataPoint';
  /** The timestamp of when the event occurred */
  ts: Scalars['Timestamp'];
  /** The value at the given timestamp */
  value: Scalars['Float'];
};

/** A data point representing the value of a metric in a time series. */
export type TimeseriesDataPointInterface = {
  /** The timestamp of when the event occurred */
  ts: Scalars['Timestamp'];
  /** The value at the given timestamp */
  value: Scalars['Float'];
};

export type TimeseriesMeta = {
  __typename?: 'TimeseriesMeta';
  /** Number of total datapoints in the timeseries */
  count: Scalars['Int'];
  /** Unix timestamp (millis) of the last datapoint of the timeseries */
  endTs: Scalars['Int'];
  /** Unix timestamp (millis) of the first datapoint of the timeseries */
  startTs: Scalars['Int'];
};

export type UnregisterQueueResult = {
  __typename?: 'UnregisterQueueResult';
  host: QueueHost;
  isRemoved: Scalars['Boolean'];
  queue: Queue;
};

export type UpdateJobFilterInput = {
  expression: Scalars['String'];
  filterId: Scalars['ID'];
  name?: InputMaybe<Scalars['String']>;
  queueId: Scalars['ID'];
  status?: InputMaybe<JobType>;
};

export type UpdateJobFilterResult = {
  __typename?: 'UpdateJobFilterResult';
  filter?: Maybe<JobFilter>;
  isUpdated: Scalars['Boolean'];
};

export type UpdateJobInput = {
  data: Scalars['JSONObject'];
  jobId: Scalars['String'];
  queueId: Scalars['String'];
};

export type UpdateJobResult = {
  __typename?: 'UpdateJobResult';
  job: Job;
};

export type UpdateMailNotificationChannelInput = {
  channel: MailNotificationChannelUpdate;
  hostId: Scalars['ID'];
};

export type UpdateSlackNotificationChannelInput = {
  channel: SlackNotificationChannelUpdate;
  hostId: Scalars['ID'];
};

export type UpdateWebhookNotificationChannelInput = {
  channel: WebhookNotificationChannelUpdate;
  hostId: Scalars['ID'];
};

export type ValidateJobDataInput = {
  data?: InputMaybe<Scalars['JSONObject']>;
  jobName: Scalars['String'];
  opts?: InputMaybe<JobOptionsInput>;
  queueId: Scalars['ID'];
};

export type ValidateJobDataResult = {
  __typename?: 'ValidateJobDataResult';
  jobName: Scalars['String'];
  queueId: Scalars['ID'];
};

export type ValidateJobOptionsResult = {
  __typename?: 'ValidateJobOptionsResult';
  errors: Array<Scalars['String']>;
  isValid: Scalars['Boolean'];
};

/** A channel that posts notifications to a webhook */
export type WebhookNotificationChannel = NotificationChannel & {
  __typename?: 'WebhookNotificationChannel';
  /** Set this to true to allow sending body for the GET method. This option is only meant to interact with non-compliant servers when you have no other choice. */
  allowGetBody?: Maybe<Scalars['Boolean']>;
  /** Timestamp of channel creation */
  createdAt?: Maybe<Scalars['Date']>;
  /** Is the channel enabled ? */
  enabled: Scalars['Boolean'];
  /** Defines if redirect responses should be followed automatically. */
  followRedirect?: Maybe<Scalars['Boolean']>;
  /** Optional request headers */
  headers?: Maybe<Scalars['JSONObject']>;
  /** Optional success http status codes. Defaults to http codes 200 - 206 */
  httpSuccessCodes?: Maybe<Array<Scalars['Int']>>;
  id: Scalars['ID'];
  /** The HTTP method to use */
  method?: Maybe<HttpMethodEnum>;
  /** The name of the channel */
  name: Scalars['String'];
  /** The number of times to retry the client */
  retry?: Maybe<Scalars['Int']>;
  /** Milliseconds to wait for the server to end the response before aborting the client. By default, there is no timeout. */
  timeout?: Maybe<Scalars['Duration']>;
  /** The type of the channel, e.g. slack, email, webhook etc */
  type: Scalars['String'];
  /** Timestamp of last channel update */
  updatedAt?: Maybe<Scalars['Date']>;
  /** Url to send data to */
  url: Scalars['URL'];
};

export type WebhookNotificationChannelUpdate = {
  /** Set this to true to allow sending body for the GET method. This option is only meant to interact with non-compliant servers when you have no other choice. */
  allowGetBody?: InputMaybe<Scalars['Boolean']>;
  /** Is the channel enabled ? */
  enabled: Scalars['Boolean'];
  /** Defines if redirect responses should be followed automatically. */
  followRedirect?: InputMaybe<Scalars['Boolean']>;
  /** Optional request headers */
  headers?: InputMaybe<Scalars['JSONObject']>;
  /** Optional success http status codes. Defaults to http codes 200 - 206 */
  httpSuccessCodes?: InputMaybe<Array<Scalars['Int']>>;
  /** The HTTP method to use */
  method?: InputMaybe<HttpMethodEnum>;
  /** The name of the channel */
  name: Scalars['String'];
  /** The number of times to retry the client */
  retry?: InputMaybe<Scalars['Int']>;
  /** Milliseconds to wait for the server to end the response before aborting the client. By default, there is no timeout. */
  timeout?: InputMaybe<Scalars['Duration']>;
  /** The type of the channel, e.g. slack, email, webhook etc */
  type: Scalars['String'];
  /** Url to send data to */
  url: Scalars['URL'];
};

export type GetAppInfoQueryVariables = Exact<{ [key: string]: never }>;

export type GetAppInfoQuery = {
  __typename?: 'Query';
  appInfo: {
    __typename?: 'AppInfo';
    env: string;
    title: string;
    version: string;
    brand?: string | null;
    author?: string | null;
  };
};

export type HostsPageDataQueryVariables = Exact<{
  range: Scalars['String'];
  granularity?: StatsGranularity;
}>;

export type HostsPageDataQuery = {
  __typename?: 'Query';
  hosts: Array<{
    __typename?: 'QueueHost';
    id: string;
    name: string;
    queueCount: number;
    workerCount: number;
    redis: { __typename?: 'RedisInfo' } & RedisStatsFragment;
    jobCounts: {
      __typename?: 'JobCounts';
      active?: number | null;
      failed?: number | null;
      paused?: number | null;
      completed?: number | null;
      delayed?: number | null;
      waiting?: number | null;
    };
    throughput: {
      __typename?: 'Meter';
      count: number;
      m1Rate: number;
      m5Rate: number;
      m15Rate: number;
    };
    errorRate: {
      __typename?: 'Meter';
      count: number;
      m1Rate: number;
      m5Rate: number;
      m15Rate: number;
    };
    stats: Array<{ __typename?: 'StatsSnapshot' } & StatsSnapshotFragment>;
    statsAggregate?:
      | ({ __typename?: 'StatsSnapshot' } & StatsSnapshotFragment)
      | null;
    lastStatsSnapshot?:
      | ({ __typename?: 'StatsSnapshot' } & StatsSnapshotFragment)
      | null;
  }>;
};

export type HostOverviewQueryVariables = Exact<{
  id: Scalars['ID'];
  range: Scalars['String'];
  granularity?: StatsGranularity;
}>;

export type HostOverviewQuery = {
  __typename?: 'Query';
  host?: {
    __typename?: 'QueueHost';
    id: string;
    queueCount: number;
    workerCount: number;
    redis: { __typename?: 'RedisInfo' } & RedisStatsFragment;
    jobCounts: {
      __typename?: 'JobCounts';
      active?: number | null;
      failed?: number | null;
      paused?: number | null;
      completed?: number | null;
      delayed?: number | null;
      waiting?: number | null;
    };
    throughput: {
      __typename?: 'Meter';
      count: number;
      m1Rate: number;
      m5Rate: number;
      m15Rate: number;
    };
    errorRate: {
      __typename?: 'Meter';
      count: number;
      m1Rate: number;
      m5Rate: number;
      m15Rate: number;
    };
    stats: Array<{ __typename?: 'StatsSnapshot' } & StatsSnapshotFragment>;
    statsAggregate?:
      | ({ __typename?: 'StatsSnapshot' } & StatsSnapshotFragment)
      | null;
    lastStatsSnapshot?:
      | ({ __typename?: 'StatsSnapshot' } & StatsSnapshotFragment)
      | null;
  } | null;
};

export type HostWorkersQueryVariables = Exact<{
  id: Scalars['ID'];
}>;

export type HostWorkersQuery = {
  __typename?: 'Query';
  host?: {
    __typename?: 'QueueHost';
    workerCount: number;
    workers: Array<{
      __typename?: 'QueueWorker';
      id?: string | null;
      addr: string;
      name?: string | null;
      age: number;
      idle: number;
      started?: number | null;
      db: number;
      role?: string | null;
    }>;
  } | null;
};

export type GetMetricDataQueryVariables = Exact<{
  id: Scalars['ID'];
  metricId: Scalars['ID'];
  input: MetricDataInput;
}>;

export type GetMetricDataQuery = {
  __typename?: 'Query';
  metric?: {
    __typename?: 'Metric';
    data: Array<{
      __typename?: 'TimeseriesDataPoint';
      ts: number;
      value: number;
    } | null>;
  } | null;
};

export type MetricFragment = {
  __typename?: 'Metric';
  id: string;
  type: MetricType;
  queueId: string;
  name: string;
  description: string;
  isActive: boolean;
  options: { [key: string]: unknown };
  createdAt: any;
  updatedAt: any;
  sampleInterval?: number | null;
  aggregator: {
    __typename?: 'Aggregator';
    type: AggregateTypeEnum;
    options?: { [key: string]: unknown } | null;
  };
  dateRange?: {
    __typename?: 'TimeSpan';
    startTime: number;
    endTime: number;
  } | null;
};

export type GetAvailableMetricsQueryVariables = Exact<{ [key: string]: never }>;

export type GetAvailableMetricsQuery = {
  __typename?: 'Query';
  availableMetrics: Array<{
    __typename?: 'MetricInfo';
    key: string;
    type: MetricType;
    description?: string | null;
    unit?: string | null;
    category: MetricCategory;
    isPolling: boolean;
  }>;
};

export type GetAvailableAggregatesQueryVariables = Exact<{
  [key: string]: never;
}>;

export type GetAvailableAggregatesQuery = {
  __typename?: 'Query';
  aggregates: Array<{
    __typename?: 'AggregateInfo';
    type: AggregateTypeEnum;
    isWindowed: boolean;
    description: string;
  } | null>;
};

export type GetMetricByIdQueryVariables = Exact<{
  id: Scalars['ID'];
  metricId: Scalars['ID'];
}>;

export type GetMetricByIdQuery = {
  __typename?: 'Query';
  metric?: ({ __typename?: 'Metric' } & MetricFragment) | null;
};

export type CreateMetricMutationVariables = Exact<{
  input: CreateMetricInput;
}>;

export type CreateMetricMutation = {
  __typename?: 'Mutation';
  createMetric: { __typename?: 'Metric' } & MetricFragment;
};

export type UpdateMetricMutationVariables = Exact<{
  input: MetricInput;
}>;

export type UpdateMetricMutation = {
  __typename?: 'Mutation';
  updateMetric: { __typename?: 'Metric' } & MetricFragment;
};

export type DeleteMetricMutationVariables = Exact<{
  input: DeleteMetricInput;
}>;

export type DeleteMetricMutation = {
  __typename?: 'Mutation';
  deleteMetric: { __typename?: 'DeleteMetricResult'; isDeleted: boolean };
};

export type GetQueueMetricsQueryVariables = Exact<{
  id: Scalars['ID'];
}>;

export type GetQueueMetricsQuery = {
  __typename?: 'Query';
  queue?: {
    __typename?: 'Queue';
    id: string;
    metricCount: number;
    metrics: Array<{ __typename?: 'Metric' } & MetricFragment>;
  } | null;
};

export type HostsAndQueuesQueryVariables = Exact<{ [key: string]: never }>;

export type HostsAndQueuesQuery = {
  __typename?: 'Query';
  hosts: Array<{
    __typename?: 'QueueHost';
    id: string;
    name: string;
    description?: string | null;
    uri: string;
    queues: Array<{ __typename?: 'Queue' } & QueueFragment>;
  }>;
};

export type RedisStatsFragment = {
  __typename?: 'RedisInfo';
  redis_version: string;
  uptime_in_seconds: number;
  uptime_in_days: number;
  connected_clients: number;
  blocked_clients: number;
  total_system_memory: number;
  total_system_memory_human: string;
  used_memory_human: string;
  used_memory: number;
  used_memory_peak: number;
  used_memory_peak_human: string;
  used_memory_lua: number;
  used_cpu_sys: number;
  maxmemory: number;
  number_of_cached_scripts: number;
  instantaneous_ops_per_sec: number;
  mem_fragmentation_ratio?: number | null;
  role: string;
  os: string;
  tcp_port: number;
  redis_mode: string;
};

export type HostFragment = {
  __typename?: 'QueueHost';
  id: string;
  name: string;
  description?: string | null;
  uri: string;
  redis: { __typename?: 'RedisInfo' } & RedisStatsFragment;
};

export type GetAllHostsQueryVariables = Exact<{ [key: string]: never }>;

export type GetAllHostsQuery = {
  __typename?: 'Query';
  hosts: Array<{ __typename?: 'QueueHost' } & HostFragment>;
};

export type GetHostsAndQueuesQueryVariables = Exact<{ [key: string]: never }>;

export type GetHostsAndQueuesQuery = {
  __typename?: 'Query';
  hosts: Array<{
    __typename?: 'QueueHost';
    id: string;
    name: string;
    description?: string | null;
    uri: string;
    redis: { __typename?: 'RedisInfo' } & RedisStatsFragment;
    queues: Array<{ __typename?: 'Queue' } & QueueFragment>;
  }>;
};

export type GetHostByIdQueryVariables = Exact<{
  id: Scalars['ID'];
}>;

export type GetHostByIdQuery = {
  __typename?: 'Query';
  host?: ({ __typename?: 'QueueHost' } & HostFragment) | null;
};

export type GetHostByIdFullQueryVariables = Exact<{
  id: Scalars['ID'];
}>;

export type GetHostByIdFullQuery = {
  __typename?: 'Query';
  host?: {
    __typename?: 'QueueHost';
    id: string;
    name: string;
    description?: string | null;
    uri: string;
    redis: { __typename?: 'RedisInfo' } & RedisStatsFragment;
    queues: Array<{ __typename?: 'Queue' } & QueueFragment>;
  } | null;
};

export type GetHostQueuesQueryVariables = Exact<{
  id: Scalars['ID'];
}>;

export type GetHostQueuesQuery = {
  __typename?: 'Query';
  host?: {
    __typename?: 'QueueHost';
    id: string;
    name: string;
    description?: string | null;
    queues: Array<{ __typename?: 'Queue' } & QueueFragment>;
  } | null;
};

export type HostQueuesQueryVariables = Exact<{
  id: Scalars['ID'];
  range: Scalars['String'];
  filter?: InputMaybe<HostQueuesFilter>;
}>;

export type HostQueuesQuery = {
  __typename?: 'Query';
  host?: {
    __typename?: 'QueueHost';
    id: string;
    name: string;
    description?: string | null;
    queues: Array<
      {
        __typename?: 'Queue';
        id: string;
        name: string;
        isPaused: boolean;
        isReadonly: boolean;
        workerCount: number;
        throughput: {
          __typename?: 'Meter';
          count: number;
          m1Rate: number;
          m5Rate: number;
          m15Rate: number;
        };
        errorRate: {
          __typename?: 'Meter';
          count: number;
          m1Rate: number;
          m5Rate: number;
          m15Rate: number;
        };
        stats: Array<{ __typename?: 'StatsSnapshot' } & StatsSnapshotFragment>;
        statsAggregate?:
          | ({ __typename?: 'StatsSnapshot' } & StatsSnapshotFragment)
          | null;
        lastStatsSnapshot?:
          | ({ __typename?: 'StatsSnapshot' } & StatsSnapshotFragment)
          | null;
      } & JobCountsFragment
    >;
  } | null;
};

export type GetRedisStatsQueryVariables = Exact<{
  hostId: Scalars['ID'];
}>;

export type GetRedisStatsQuery = {
  __typename?: 'Query';
  host?: {
    __typename?: 'QueueHost';
    id: string;
    redis: { __typename?: 'RedisInfo' } & RedisStatsFragment;
  } | null;
};

export type DiscoverQueuesQueryVariables = Exact<{
  hostId: Scalars['ID'];
  prefix?: InputMaybe<Scalars['String']>;
  unregisteredOnly?: InputMaybe<Scalars['Boolean']>;
}>;

export type DiscoverQueuesQuery = {
  __typename?: 'Query';
  host?: {
    __typename?: 'QueueHost';
    discoverQueues: Array<{
      __typename?: 'DiscoverQueuesPayload';
      name: string;
      prefix: string;
    }>;
  } | null;
};

export type RegisterQueueMutationVariables = Exact<{
  hostId: Scalars['ID'];
  name: Scalars['String'];
  prefix?: InputMaybe<Scalars['String']>;
  checkExists?: InputMaybe<Scalars['Boolean']>;
}>;

export type RegisterQueueMutation = {
  __typename?: 'Mutation';
  registerQueue: { __typename: 'Queue' } & QueueFragment;
};

export type UnregisterQueueMutationVariables = Exact<{
  id: Scalars['ID'];
}>;

export type UnregisterQueueMutation = {
  __typename?: 'Mutation';
  unregisterQueue: {
    __typename?: 'UnregisterQueueResult';
    isRemoved: boolean;
    host: { __typename?: 'QueueHost'; id: string };
  };
};

export type JobRepeatOptionsFragment = {
  __typename?: 'JobRepeatOptions';
  cron?: string | null;
  tz?: string | null;
  startDate?: any | null;
  endDate?: any | null;
  limit?: number | null;
  every?: string | null;
  jobId?: string | null;
  count?: number | null;
};

export type JobOptionsFragment = {
  __typename?: 'JobOptions';
  timestamp?: any | null;
  priority?: number | null;
  delay?: number | null;
  attempts?: number | null;
  backoff?: any | null;
  lifo?: boolean | null;
  timeout?: number | null;
  jobId?: string | null;
  removeOnComplete?: boolean | number | null;
  removeOnFail?: boolean | number | null;
  stackTraceLimit?: number | null;
  repeat?:
    | ({ __typename?: 'JobRepeatOptions' } & JobRepeatOptionsFragment)
    | null;
};

export type JobFragment = {
  __typename?: 'Job';
  id: string;
  queueId: string;
  timestamp: any;
  state?: JobState | null;
  name: string;
  data: { [key: string]: unknown };
  delay: number;
  progress?: string | number | Record<string, unknown> | null;
  attemptsMade: number;
  processedOn?: any | null;
  finishedOn?: any | null;
  failedReason?: any | null;
  stacktrace: Array<string>;
  returnvalue?: any | null;
  opts: { __typename?: 'JobOptions' } & JobOptionsFragment;
};

export type RepeatableJobFragment = {
  __typename?: 'RepeatableJob';
  key: string;
  id?: string | null;
  name?: string | null;
  endDate?: any | null;
  tz?: string | null;
  cron?: string | null;
  next?: any | null;
  descr?: string | null;
};

export type FindJobsQueryVariables = Exact<{
  queueId: Scalars['ID'];
  status?: InputMaybe<JobSearchStatus>;
  criteria: Scalars['String'];
  cursor?: InputMaybe<Scalars['String']>;
  limit?: InputMaybe<Scalars['Int']>;
}>;

export type FindJobsQuery = {
  __typename?: 'Query';
  findJobs: {
    __typename?: 'FindJobsResult';
    nextCursor: string;
    jobs: Array<{ __typename?: 'Job' } & JobFragment>;
  };
};

export type GetJobsByFilterQueryVariables = Exact<{
  queueId: Scalars['ID'];
  status?: InputMaybe<JobSearchStatus>;
  cursor?: InputMaybe<Scalars['String']>;
  criteria?: InputMaybe<Scalars['String']>;
  count?: InputMaybe<Scalars['Int']>;
  pattern?: InputMaybe<Scalars['String']>;
}>;

export type GetJobsByFilterQuery = {
  __typename?: 'Query';
  queue?:
    | ({
        __typename?: 'Queue';
        id: string;
        jobsByFilter: {
          __typename?: 'JobsByFilterPayload';
          cursor?: string | null;
          total: number;
          current: number;
          jobs: Array<{ __typename?: 'Job' } & JobFragment>;
        };
      } & JobCountsFragment)
    | null;
};

export type GetJobsByIdQueryVariables = Exact<{
  queueId: Scalars['ID'];
  ids: Array<Scalars['ID']> | Scalars['ID'];
}>;

export type GetJobsByIdQuery = {
  __typename?: 'Query';
  getJobsById: Array<{ __typename?: 'Job' } & JobFragment>;
};

export type GetJobFiltersQueryVariables = Exact<{
  queueId: Scalars['ID'];
  ids?: InputMaybe<Array<Scalars['ID']> | Scalars['ID']>;
}>;

export type GetJobFiltersQuery = {
  __typename?: 'Query';
  queue?: {
    __typename?: 'Queue';
    jobFilters: Array<{
      __typename?: 'JobFilter';
      id: string;
      name: string;
      expression: string;
      pattern?: string | null;
      status?: JobType | null;
      createdAt?: any | null;
    }>;
  } | null;
};

export type CreateJobFilterMutationVariables = Exact<{
  input: CreateJobFilterInput;
}>;

export type CreateJobFilterMutation = {
  __typename?: 'Mutation';
  createJobFilter: {
    __typename?: 'JobFilter';
    id: string;
    name: string;
    expression: string;
    createdAt?: any | null;
  };
};

export type UpdateJobFilterMutationVariables = Exact<{
  input: UpdateJobFilterInput;
}>;

export type UpdateJobFilterMutation = {
  __typename?: 'Mutation';
  updateJobFilter: {
    __typename?: 'UpdateJobFilterResult';
    isUpdated: boolean;
    filter?: {
      __typename?: 'JobFilter';
      id: string;
      name: string;
      expression: string;
      createdAt?: any | null;
    } | null;
  };
};

export type DeleteJobFilterMutationVariables = Exact<{
  input: DeleteJobFilterInput;
}>;

export type DeleteJobFilterMutation = {
  __typename?: 'Mutation';
  deleteJobFilter: { __typename?: 'DeleteJobFilterResult'; isDeleted: boolean };
};

export type GetQueueJobCountsQueryVariables = Exact<{
  queueId: Scalars['ID'];
}>;

export type GetQueueJobCountsQuery = {
  __typename?: 'Query';
  queue?: ({ __typename?: 'Queue'; id: string } & JobCountsFragment) | null;
};

export type GetQueueJobsQueryVariables = Exact<{
  queueId: Scalars['ID'];
  offset?: InputMaybe<Scalars['Int']>;
  limit?: InputMaybe<Scalars['Int']>;
  status?: InputMaybe<JobSearchStatus>;
  sortOrder?: InputMaybe<SortOrderEnum>;
}>;

export type GetQueueJobsQuery = {
  __typename?: 'Query';
  queue?:
    | ({
        __typename?: 'Queue';
        jobs: Array<{ __typename?: 'Job' } & JobFragment>;
      } & JobCountsFragment)
    | null;
};

export type GetJobsQueryVariables = Exact<{
  queueId: Scalars['ID'];
  offset?: InputMaybe<Scalars['Int']>;
  limit?: InputMaybe<Scalars['Int']>;
  status?: InputMaybe<JobState>;
  sortOrder?: InputMaybe<SortOrderEnum>;
}>;

export type GetJobsQuery = {
  __typename?: 'Query';
  getJobs: Array<{ __typename?: 'Job' } & JobFragment>;
};

export type GetRepeatableJobsQueryVariables = Exact<{
  queueId: Scalars['ID'];
  offset?: InputMaybe<Scalars['Int']>;
  limit?: InputMaybe<Scalars['Int']>;
  sortOrder?: InputMaybe<SortOrderEnum>;
}>;

export type GetRepeatableJobsQuery = {
  __typename?: 'Query';
  queue?: {
    __typename?: 'Queue';
    id: string;
    repeatableJobCount: number;
    repeatableJobs: Array<
      { __typename?: 'RepeatableJob' } & RepeatableJobFragment
    >;
  } | null;
};

export type GetJobByIdQueryVariables = Exact<{
  queueId: Scalars['ID'];
  id: Scalars['ID'];
}>;

export type GetJobByIdQuery = {
  __typename?: 'Query';
  job: { __typename?: 'Job' } & JobFragment;
};

export type GetJobLogsQueryVariables = Exact<{
  queueId: Scalars['ID'];
  id: Scalars['ID'];
  start?: InputMaybe<Scalars['Int']>;
  end?: InputMaybe<Scalars['Int']>;
}>;

export type GetJobLogsQuery = {
  __typename?: 'Query';
  job: {
    __typename?: 'Job';
    logs: { __typename?: 'JobLogs'; count: number; items: Array<string> };
  };
};

export type CreateJobMutationVariables = Exact<{
  id: Scalars['ID'];
  jobName: Scalars['String'];
  data?: InputMaybe<Scalars['JSONObject']>;
  options?: InputMaybe<JobOptionsInput>;
}>;

export type CreateJobMutation = {
  __typename?: 'Mutation';
  createJob: { __typename?: 'Job' } & JobFragment;
};

export type DeleteJobMutationVariables = Exact<{
  queueId: Scalars['ID'];
  jobId: Scalars['ID'];
}>;

export type DeleteJobMutation = {
  __typename?: 'Mutation';
  deleteJob: {
    __typename?: 'DeleteJobPayload';
    job: { __typename?: 'Job'; id: string };
  };
};

export type DiscardJobMutationVariables = Exact<{
  queueId: Scalars['ID'];
  jobId: Scalars['ID'];
}>;

export type DiscardJobMutation = {
  __typename?: 'Mutation';
  discardJob: {
    __typename?: 'DiscardJobResult';
    job: { __typename?: 'Job'; id: string; state?: JobState | null };
  };
};

export type MoveJobToCompletedMutationVariables = Exact<{
  queueId: Scalars['ID'];
  jobId: Scalars['ID'];
}>;

export type MoveJobToCompletedMutation = {
  __typename?: 'Mutation';
  moveJobToCompleted: {
    __typename?: 'MoveJobToCompletedResult';
    job?: { __typename?: 'Job'; id: string; state?: JobState | null } | null;
  };
};

export type MoveJobToFailedMutationVariables = Exact<{
  queueId: Scalars['ID'];
  jobId: Scalars['ID'];
}>;

export type MoveJobToFailedMutation = {
  __typename?: 'Mutation';
  moveJobToFailed: {
    __typename?: 'MoveoJobToFailedResult';
    job: { __typename?: 'Job'; id: string; state?: JobState | null };
  };
};

export type DeleteRepeatableJobByKeyMutationVariables = Exact<{
  queueId: Scalars['ID'];
  key: Scalars['String'];
}>;

export type DeleteRepeatableJobByKeyMutation = {
  __typename?: 'Mutation';
  deleteRepeatableJobByKey: {
    __typename?: 'DeleteRepeatableJobByKeyResult';
    key: string;
  };
};

export type DeleteBulkJobsMutationVariables = Exact<{
  queueId: Scalars['ID'];
  jobIds: Array<Scalars['ID']> | Scalars['ID'];
}>;

export type DeleteBulkJobsMutation = {
  __typename?: 'Mutation';
  bulkDeleteJobs?: {
    __typename?: 'BulkJobActionPayload';
    status: Array<{
      __typename?: 'BulkStatusItem';
      id: string;
      success: boolean;
      reason?: string | null;
    } | null>;
  } | null;
};

export type RetryJobMutationVariables = Exact<{
  queueId: Scalars['ID'];
  jobId: Scalars['ID'];
}>;

export type RetryJobMutation = {
  __typename?: 'Mutation';
  retryJob: {
    __typename?: 'RetryJobResult';
    job: { __typename?: 'Job'; id: string; state?: JobState | null };
  };
};

export type RetryBulkJobsMutationVariables = Exact<{
  queueId: Scalars['ID'];
  jobIds: Array<Scalars['ID']> | Scalars['ID'];
}>;

export type RetryBulkJobsMutation = {
  __typename?: 'Mutation';
  bulkRetryJobs?: {
    __typename?: 'BulkJobActionPayload';
    status: Array<{
      __typename?: 'BulkStatusItem';
      id: string;
      success: boolean;
      reason?: string | null;
    } | null>;
  } | null;
};

export type PromoteJobMutationVariables = Exact<{
  queueId: Scalars['ID'];
  jobId: Scalars['ID'];
}>;

export type PromoteJobMutation = {
  __typename?: 'Mutation';
  promoteJob: {
    __typename?: 'PromoteJobResult';
    job: { __typename?: 'Job'; id: string; state?: JobState | null };
  };
};

export type PromoteBulkJobsMutationVariables = Exact<{
  queueId: Scalars['ID'];
  jobIds: Array<Scalars['ID']> | Scalars['ID'];
}>;

export type PromoteBulkJobsMutation = {
  __typename?: 'Mutation';
  bulkPromoteJobs?: {
    __typename?: 'BulkJobActionPayload';
    status: Array<{
      __typename?: 'BulkStatusItem';
      id: string;
      success: boolean;
      reason?: string | null;
    } | null>;
  } | null;
};

export type DeleteJobsByFilterMutationVariables = Exact<{
  queueId: Scalars['ID'];
  status?: InputMaybe<JobSearchStatus>;
  filter: Scalars['String'];
  pattern?: InputMaybe<Scalars['String']>;
}>;

export type DeleteJobsByFilterMutation = {
  __typename?: 'Mutation';
  deleteJobsByFilter: {
    __typename?: 'DeleteJobsByFilterPayload';
    removed: number;
  };
};

export type DeleteJobsByPatternMutationVariables = Exact<{
  queueId: Scalars['ID'];
  status?: InputMaybe<JobSearchStatus>;
  pattern?: InputMaybe<Scalars['String']>;
}>;

export type DeleteJobsByPatternMutation = {
  __typename?: 'Mutation';
  deleteJobsByPattern: {
    __typename?: 'DeleteJobsByPatternPayload';
    removed: number;
  };
};

export type JobCountsFragment = {
  __typename?: 'Queue';
  jobCounts: {
    __typename?: 'JobCounts';
    active?: number | null;
    failed?: number | null;
    paused?: number | null;
    completed?: number | null;
    delayed?: number | null;
    waiting?: number | null;
  };
};

export type QueueFragment = {
  __typename?: 'Queue';
  id: string;
  name: string;
  host: string;
  hostId: string;
  prefix: string;
  isPaused: boolean;
  isReadonly: boolean;
  repeatableJobCount: number;
  workerCount: number;
} & JobCountsFragment;

export type QueueWorkersFragment = {
  __typename?: 'Queue';
  workers: Array<{
    __typename?: 'QueueWorker';
    id?: string | null;
    name?: string | null;
    addr: string;
    age: number;
    started?: number | null;
    idle: number;
    role?: string | null;
    db: number;
    omem: number;
  }>;
};

export type GetQueueByIdQueryVariables = Exact<{
  id: Scalars['ID'];
}>;

export type GetQueueByIdQuery = {
  __typename?: 'Query';
  queue?: ({ __typename?: 'Queue' } & QueueFragment) | null;
};

export type PauseQueueMutationVariables = Exact<{
  id: Scalars['ID'];
}>;

export type PauseQueueMutation = {
  __typename?: 'Mutation';
  pauseQueue: { __typename?: 'Queue'; isPaused: boolean };
};

export type ResumeQueueMutationVariables = Exact<{
  id: Scalars['ID'];
}>;

export type ResumeQueueMutation = {
  __typename?: 'Mutation';
  resumeQueue: { __typename?: 'Queue'; isPaused: boolean };
};

export type DeleteQueueMutationVariables = Exact<{
  id: Scalars['ID'];
  checkActivity?: InputMaybe<Scalars['Boolean']>;
}>;

export type DeleteQueueMutation = {
  __typename?: 'Mutation';
  deleteQueue: {
    __typename?: 'DeleteQueueDeleteResult';
    queueId: string;
    deletedJobCount: number;
  };
};

export type CleanQueueMutationVariables = Exact<{
  id: Scalars['ID'];
  grace: Scalars['Duration'];
  limit?: InputMaybe<Scalars['Int']>;
  status?: InputMaybe<CleanQueueJobType>;
}>;

export type CleanQueueMutation = {
  __typename?: 'Mutation';
  cleanQueue: { __typename?: 'QueueCleanResult'; count: number };
};

export type DrainQueueMutationVariables = Exact<{
  id: Scalars['ID'];
  delayed?: InputMaybe<Scalars['Boolean']>;
}>;

export type DrainQueueMutation = {
  __typename?: 'Mutation';
  drainQueue: {
    __typename?: 'DrainQueueResult';
    queue: { __typename?: 'Queue' } & QueueFragment;
  };
};

export type GetQueueWorkersQueryVariables = Exact<{
  id: Scalars['ID'];
}>;

export type GetQueueWorkersQuery = {
  __typename?: 'Query';
  queue?: {
    __typename?: 'Queue';
    id: string;
    workers: Array<{
      __typename?: 'QueueWorker';
      id?: string | null;
      name?: string | null;
      addr: string;
      age: number;
      started?: number | null;
      idle: number;
      role?: string | null;
      db: number;
      omem: number;
    }>;
  } | null;
};

export type GetJobSchemasQueryVariables = Exact<{
  id: Scalars['ID'];
}>;

export type GetJobSchemasQuery = {
  __typename?: 'Query';
  queue?: {
    __typename?: 'Queue';
    jobSchemas: Array<{
      __typename?: 'JobSchema';
      jobName: string;
      schema?: { [key: string]: unknown } | null;
      defaultOpts?: { [key: string]: unknown } | null;
    }>;
  } | null;
};

export type GetJobSchemaQueryVariables = Exact<{
  id: Scalars['ID'];
  jobName: Scalars['String'];
}>;

export type GetJobSchemaQuery = {
  __typename?: 'Query';
  queueJobSchema?: {
    __typename?: 'JobSchema';
    jobName: string;
    schema?: { [key: string]: unknown } | null;
    defaultOpts?: { [key: string]: unknown } | null;
  } | null;
};

export type SetJobSchemaMutationVariables = Exact<{
  id: Scalars['ID'];
  jobName: Scalars['String'];
  schema: Scalars['JSONSchema'];
  defaultOpts?: InputMaybe<JobOptionsInput>;
}>;

export type SetJobSchemaMutation = {
  __typename?: 'Mutation';
  setJobSchema: {
    __typename?: 'JobSchema';
    jobName: string;
    schema?: { [key: string]: unknown } | null;
    defaultOpts?: { [key: string]: unknown } | null;
  };
};

export type DeleteJobSchemaMutationVariables = Exact<{
  id: Scalars['ID'];
  jobName: Scalars['String'];
}>;

export type DeleteJobSchemaMutation = {
  __typename?: 'Mutation';
  deleteJobSchema: { __typename?: 'DeleteJobSchemaResult'; jobName: string };
};

export type InferJobSchemaQueryVariables = Exact<{
  queueId: Scalars['ID'];
  jobName: Scalars['String'];
}>;

export type InferJobSchemaQuery = {
  __typename?: 'Query';
  inferJobSchema?: {
    __typename?: 'JobSchema';
    jobName: string;
    schema?: { [key: string]: unknown } | null;
    defaultOpts?: { [key: string]: unknown } | null;
  } | null;
};

export type GetJobOptionsSchemaQueryVariables = Exact<{ [key: string]: never }>;

export type GetJobOptionsSchemaQuery = {
  __typename?: 'Query';
  jobOptionsSchema: { [key: string]: unknown };
};

export type GetQueueJobsNamesQueryVariables = Exact<{
  id: Scalars['ID'];
}>;

export type GetQueueJobsNamesQuery = {
  __typename?: 'Query';
  queue?: { __typename?: 'Queue'; jobNames: Array<string> } | null;
};

export type GetPageQueueStatsQueryVariables = Exact<{
  id: Scalars['ID'];
  range: Scalars['String'];
  granularity: StatsGranularity;
}>;

export type GetPageQueueStatsQuery = {
  __typename?: 'Query';
  queue?: {
    __typename?: 'Queue';
    id: string;
    name: string;
    hostId: string;
    prefix: string;
    isPaused: boolean;
    jobNames: Array<string>;
    workerCount: number;
    throughput: {
      __typename?: 'Meter';
      m1Rate: number;
      m5Rate: number;
      m15Rate: number;
    };
    errorRate: {
      __typename?: 'Meter';
      m1Rate: number;
      m5Rate: number;
      m15Rate: number;
    };
    stats: Array<{ __typename?: 'StatsSnapshot' } & StatsSnapshotFragment>;
    statsAggregate?:
      | ({ __typename?: 'StatsSnapshot' } & StatsSnapshotFragment)
      | null;
  } | null;
};

export type MeterFragment = {
  __typename?: 'Meter';
  count: number;
  meanRate: number;
  m1Rate: number;
  m5Rate: number;
  m15Rate: number;
};

export type StatsSnapshotFragment = {
  __typename?: 'StatsSnapshot';
  count: number;
  failed: number;
  completed: number;
  startTime: any;
  endTime: any;
  stddev: number;
  mean: number;
  min: number;
  max: number;
  median: number;
  p90: number;
  p95: number;
  p99: number;
  p995: number;
  meanRate: number;
  m1Rate: number;
  m5Rate: number;
  m15Rate: number;
};

export type GetStatsSpanQueryVariables = Exact<{
  id: Scalars['ID'];
  input: StatsSpanInput;
}>;

export type GetStatsSpanQuery = {
  __typename?: 'Query';
  queue?: {
    __typename?: 'Queue';
    statsDateRange?: {
      __typename?: 'TimeSpan';
      startTime: number;
      endTime: number;
    } | null;
  } | null;
};

export type GetQueueStatsQueryVariables = Exact<{
  id: Scalars['ID'];
  input: StatsQueryInput;
}>;

export type GetQueueStatsQuery = {
  __typename?: 'Query';
  queue?: {
    __typename?: 'Queue';
    stats: Array<{ __typename?: 'StatsSnapshot' } & StatsSnapshotFragment>;
  } | null;
};

export type GetQueueStatsLatestQueryVariables = Exact<{
  id: Scalars['ID'];
  input: StatsLatestInput;
}>;

export type GetQueueStatsLatestQuery = {
  __typename?: 'Query';
  queue?: {
    __typename?: 'Queue';
    lastStatsSnapshot?:
      | ({ __typename?: 'StatsSnapshot' } & StatsSnapshotFragment)
      | null;
  } | null;
};

export type GetHostStatsLatestQueryVariables = Exact<{
  id: Scalars['ID'];
  input: StatsLatestInput;
}>;

export type GetHostStatsLatestQuery = {
  __typename?: 'Query';
  host?: {
    __typename?: 'QueueHost';
    lastStatsSnapshot?:
      | ({ __typename?: 'StatsSnapshot' } & StatsSnapshotFragment)
      | null;
  } | null;
};

export type QueueStatsUpdatedSubscriptionVariables = Exact<{
  input: StatsUpdatedSubscriptionFilter;
}>;

export type QueueStatsUpdatedSubscription = {
  __typename?: 'Subscription';
  onQueueStatsUpdated: { __typename?: 'StatsSnapshot' } & StatsSnapshotFragment;
};

export type HostStatsUpdatedSubscriptionVariables = Exact<{
  input: StatsUpdatedSubscriptionFilter;
}>;

export type HostStatsUpdatedSubscription = {
  __typename?: 'Subscription';
  onHostStatsUpdated: { __typename?: 'StatsSnapshot' } & StatsSnapshotFragment;
};

export const MetricFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Metric' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'Metric' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'type' } },
          { kind: 'Field', name: { kind: 'Name', value: 'queueId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isActive' } },
          { kind: 'Field', name: { kind: 'Name', value: 'options' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'sampleInterval' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'aggregator' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'type' } },
                { kind: 'Field', name: { kind: 'Name', value: 'options' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'dateRange' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'startTime' } },
                { kind: 'Field', name: { kind: 'Name', value: 'endTime' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;
export const RedisStatsFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'RedisStats' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'RedisInfo' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'redis_version' } },
          { kind: 'Field', name: { kind: 'Name', value: 'uptime_in_seconds' } },
          { kind: 'Field', name: { kind: 'Name', value: 'uptime_in_days' } },
          { kind: 'Field', name: { kind: 'Name', value: 'connected_clients' } },
          { kind: 'Field', name: { kind: 'Name', value: 'blocked_clients' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'total_system_memory' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'total_system_memory_human' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'used_memory_human' } },
          { kind: 'Field', name: { kind: 'Name', value: 'used_memory' } },
          { kind: 'Field', name: { kind: 'Name', value: 'used_memory_peak' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'used_memory_peak_human' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'used_memory_lua' } },
          { kind: 'Field', name: { kind: 'Name', value: 'used_cpu_sys' } },
          { kind: 'Field', name: { kind: 'Name', value: 'maxmemory' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'number_of_cached_scripts' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'instantaneous_ops_per_sec' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'mem_fragmentation_ratio' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'role' } },
          { kind: 'Field', name: { kind: 'Name', value: 'os' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tcp_port' } },
          { kind: 'Field', name: { kind: 'Name', value: 'redis_mode' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode;
export const HostFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Host' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'QueueHost' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'uri' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'redis' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'RedisStats' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'RedisStats' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'RedisInfo' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'redis_version' } },
          { kind: 'Field', name: { kind: 'Name', value: 'uptime_in_seconds' } },
          { kind: 'Field', name: { kind: 'Name', value: 'uptime_in_days' } },
          { kind: 'Field', name: { kind: 'Name', value: 'connected_clients' } },
          { kind: 'Field', name: { kind: 'Name', value: 'blocked_clients' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'total_system_memory' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'total_system_memory_human' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'used_memory_human' } },
          { kind: 'Field', name: { kind: 'Name', value: 'used_memory' } },
          { kind: 'Field', name: { kind: 'Name', value: 'used_memory_peak' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'used_memory_peak_human' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'used_memory_lua' } },
          { kind: 'Field', name: { kind: 'Name', value: 'used_cpu_sys' } },
          { kind: 'Field', name: { kind: 'Name', value: 'maxmemory' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'number_of_cached_scripts' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'instantaneous_ops_per_sec' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'mem_fragmentation_ratio' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'role' } },
          { kind: 'Field', name: { kind: 'Name', value: 'os' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tcp_port' } },
          { kind: 'Field', name: { kind: 'Name', value: 'redis_mode' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode;
export const JobRepeatOptionsFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'JobRepeatOptions' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'JobRepeatOptions' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'cron' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tz' } },
          { kind: 'Field', name: { kind: 'Name', value: 'startDate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'endDate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'limit' } },
          { kind: 'Field', name: { kind: 'Name', value: 'every' } },
          { kind: 'Field', name: { kind: 'Name', value: 'jobId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'count' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode;
export const JobOptionsFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'JobOptions' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'JobOptions' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'timestamp' } },
          { kind: 'Field', name: { kind: 'Name', value: 'priority' } },
          { kind: 'Field', name: { kind: 'Name', value: 'delay' } },
          { kind: 'Field', name: { kind: 'Name', value: 'attempts' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'repeat' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'JobRepeatOptions' },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'backoff' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lifo' } },
          { kind: 'Field', name: { kind: 'Name', value: 'timeout' } },
          { kind: 'Field', name: { kind: 'Name', value: 'jobId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'removeOnComplete' } },
          { kind: 'Field', name: { kind: 'Name', value: 'removeOnFail' } },
          { kind: 'Field', name: { kind: 'Name', value: 'stackTraceLimit' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'JobRepeatOptions' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'JobRepeatOptions' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'cron' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tz' } },
          { kind: 'Field', name: { kind: 'Name', value: 'startDate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'endDate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'limit' } },
          { kind: 'Field', name: { kind: 'Name', value: 'every' } },
          { kind: 'Field', name: { kind: 'Name', value: 'jobId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'count' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode;
export const JobFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Job' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'Job' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'queueId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'timestamp' } },
          { kind: 'Field', name: { kind: 'Name', value: 'state' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'data' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'opts' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'JobOptions' },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'delay' } },
          { kind: 'Field', name: { kind: 'Name', value: 'progress' } },
          { kind: 'Field', name: { kind: 'Name', value: 'attemptsMade' } },
          { kind: 'Field', name: { kind: 'Name', value: 'processedOn' } },
          { kind: 'Field', name: { kind: 'Name', value: 'finishedOn' } },
          { kind: 'Field', name: { kind: 'Name', value: 'failedReason' } },
          { kind: 'Field', name: { kind: 'Name', value: 'stacktrace' } },
          { kind: 'Field', name: { kind: 'Name', value: 'returnvalue' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'JobRepeatOptions' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'JobRepeatOptions' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'cron' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tz' } },
          { kind: 'Field', name: { kind: 'Name', value: 'startDate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'endDate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'limit' } },
          { kind: 'Field', name: { kind: 'Name', value: 'every' } },
          { kind: 'Field', name: { kind: 'Name', value: 'jobId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'count' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'JobOptions' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'JobOptions' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'timestamp' } },
          { kind: 'Field', name: { kind: 'Name', value: 'priority' } },
          { kind: 'Field', name: { kind: 'Name', value: 'delay' } },
          { kind: 'Field', name: { kind: 'Name', value: 'attempts' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'repeat' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'JobRepeatOptions' },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'backoff' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lifo' } },
          { kind: 'Field', name: { kind: 'Name', value: 'timeout' } },
          { kind: 'Field', name: { kind: 'Name', value: 'jobId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'removeOnComplete' } },
          { kind: 'Field', name: { kind: 'Name', value: 'removeOnFail' } },
          { kind: 'Field', name: { kind: 'Name', value: 'stackTraceLimit' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode;
export const RepeatableJobFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'RepeatableJob' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'RepeatableJob' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'key' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'endDate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tz' } },
          { kind: 'Field', name: { kind: 'Name', value: 'cron' } },
          { kind: 'Field', name: { kind: 'Name', value: 'next' } },
          { kind: 'Field', name: { kind: 'Name', value: 'descr' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode;
export const JobCountsFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'JobCounts' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'Queue' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'jobCounts' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'active' } },
                { kind: 'Field', name: { kind: 'Name', value: 'failed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'paused' } },
                { kind: 'Field', name: { kind: 'Name', value: 'completed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'delayed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'waiting' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;
export const QueueFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Queue' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'Queue' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'host' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hostId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'prefix' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isPaused' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isReadonly' } },
          {
            kind: 'FragmentSpread',
            name: { kind: 'Name', value: 'JobCounts' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'repeatableJobCount' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'workerCount' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'JobCounts' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'Queue' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'jobCounts' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'active' } },
                { kind: 'Field', name: { kind: 'Name', value: 'failed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'paused' } },
                { kind: 'Field', name: { kind: 'Name', value: 'completed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'delayed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'waiting' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;
export const QueueWorkersFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'QueueWorkers' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'Queue' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'workers' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'addr' } },
                { kind: 'Field', name: { kind: 'Name', value: 'age' } },
                { kind: 'Field', name: { kind: 'Name', value: 'started' } },
                { kind: 'Field', name: { kind: 'Name', value: 'idle' } },
                { kind: 'Field', name: { kind: 'Name', value: 'role' } },
                { kind: 'Field', name: { kind: 'Name', value: 'db' } },
                { kind: 'Field', name: { kind: 'Name', value: 'omem' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;
export const MeterFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Meter' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'Meter' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'count' } },
          { kind: 'Field', name: { kind: 'Name', value: 'meanRate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'm1Rate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'm5Rate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'm15Rate' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode;
export const StatsSnapshotFragmentDoc = {
  kind: 'Document',
  definitions: [
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'StatsSnapshot' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'StatsSnapshot' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'count' } },
          { kind: 'Field', name: { kind: 'Name', value: 'failed' } },
          { kind: 'Field', name: { kind: 'Name', value: 'completed' } },
          { kind: 'Field', name: { kind: 'Name', value: 'startTime' } },
          { kind: 'Field', name: { kind: 'Name', value: 'endTime' } },
          { kind: 'Field', name: { kind: 'Name', value: 'stddev' } },
          { kind: 'Field', name: { kind: 'Name', value: 'mean' } },
          { kind: 'Field', name: { kind: 'Name', value: 'min' } },
          { kind: 'Field', name: { kind: 'Name', value: 'max' } },
          { kind: 'Field', name: { kind: 'Name', value: 'median' } },
          { kind: 'Field', name: { kind: 'Name', value: 'p90' } },
          { kind: 'Field', name: { kind: 'Name', value: 'p95' } },
          { kind: 'Field', name: { kind: 'Name', value: 'p99' } },
          { kind: 'Field', name: { kind: 'Name', value: 'p995' } },
          { kind: 'Field', name: { kind: 'Name', value: 'meanRate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'm1Rate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'm5Rate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'm15Rate' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode;
export const GetAppInfoDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetAppInfo' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'appInfo' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'env' } },
                { kind: 'Field', name: { kind: 'Name', value: 'title' } },
                { kind: 'Field', name: { kind: 'Name', value: 'version' } },
                { kind: 'Field', name: { kind: 'Name', value: 'brand' } },
                { kind: 'Field', name: { kind: 'Name', value: 'author' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useGetAppInfoQuery__
 *
 * To run a query within a React component, call `useGetAppInfoQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAppInfoQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetAppInfoQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetAppInfoQuery(
  baseOptions?: Apollo.QueryHookOptions<
    GetAppInfoQuery,
    GetAppInfoQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<GetAppInfoQuery, GetAppInfoQueryVariables>(
    GetAppInfoDocument,
    options,
  );
}
export function useGetAppInfoLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetAppInfoQuery,
    GetAppInfoQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<GetAppInfoQuery, GetAppInfoQueryVariables>(
    GetAppInfoDocument,
    options,
  );
}
export type GetAppInfoQueryHookResult = ReturnType<typeof useGetAppInfoQuery>;
export type GetAppInfoLazyQueryHookResult = ReturnType<
  typeof useGetAppInfoLazyQuery
>;
export type GetAppInfoQueryResult = Apollo.QueryResult<
  GetAppInfoQuery,
  GetAppInfoQueryVariables
>;
export function refetchGetAppInfoQuery(variables?: GetAppInfoQueryVariables) {
  return { query: GetAppInfoDocument, variables: variables };
}
export const HostsPageDataDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'HostsPageData' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'range' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'granularity' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'StatsGranularity' },
            },
          },
          defaultValue: { kind: 'EnumValue', value: 'Minute' },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'hosts' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'redis' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'RedisStats' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'jobCounts' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'active' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'failed' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'paused' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'completed' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'delayed' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'waiting' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'throughput' },
                  arguments: [
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'input' },
                      value: {
                        kind: 'ObjectValue',
                        fields: [
                          {
                            kind: 'ObjectField',
                            name: { kind: 'Name', value: 'range' },
                            value: {
                              kind: 'Variable',
                              name: { kind: 'Name', value: 'range' },
                            },
                          },
                          {
                            kind: 'ObjectField',
                            name: { kind: 'Name', value: 'granularity' },
                            value: {
                              kind: 'Variable',
                              name: { kind: 'Name', value: 'granularity' },
                            },
                          },
                        ],
                      },
                    },
                  ],
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'count' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'm1Rate' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'm5Rate' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'm15Rate' },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'queueCount' } },
                { kind: 'Field', name: { kind: 'Name', value: 'workerCount' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'errorRate' },
                  arguments: [
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'input' },
                      value: {
                        kind: 'ObjectValue',
                        fields: [
                          {
                            kind: 'ObjectField',
                            name: { kind: 'Name', value: 'range' },
                            value: {
                              kind: 'Variable',
                              name: { kind: 'Name', value: 'range' },
                            },
                          },
                          {
                            kind: 'ObjectField',
                            name: { kind: 'Name', value: 'granularity' },
                            value: {
                              kind: 'Variable',
                              name: { kind: 'Name', value: 'granularity' },
                            },
                          },
                        ],
                      },
                    },
                  ],
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'count' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'm1Rate' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'm5Rate' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'm15Rate' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'stats' },
                  arguments: [
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'input' },
                      value: {
                        kind: 'ObjectValue',
                        fields: [
                          {
                            kind: 'ObjectField',
                            name: { kind: 'Name', value: 'range' },
                            value: {
                              kind: 'Variable',
                              name: { kind: 'Name', value: 'range' },
                            },
                          },
                          {
                            kind: 'ObjectField',
                            name: { kind: 'Name', value: 'granularity' },
                            value: {
                              kind: 'Variable',
                              name: { kind: 'Name', value: 'granularity' },
                            },
                          },
                        ],
                      },
                    },
                  ],
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'StatsSnapshot' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'statsAggregate' },
                  arguments: [
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'input' },
                      value: {
                        kind: 'ObjectValue',
                        fields: [
                          {
                            kind: 'ObjectField',
                            name: { kind: 'Name', value: 'range' },
                            value: {
                              kind: 'Variable',
                              name: { kind: 'Name', value: 'range' },
                            },
                          },
                          {
                            kind: 'ObjectField',
                            name: { kind: 'Name', value: 'granularity' },
                            value: {
                              kind: 'Variable',
                              name: { kind: 'Name', value: 'granularity' },
                            },
                          },
                        ],
                      },
                    },
                  ],
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'StatsSnapshot' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'lastStatsSnapshot' },
                  arguments: [
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'input' },
                      value: {
                        kind: 'ObjectValue',
                        fields: [
                          {
                            kind: 'ObjectField',
                            name: { kind: 'Name', value: 'granularity' },
                            value: {
                              kind: 'Variable',
                              name: { kind: 'Name', value: 'granularity' },
                            },
                          },
                        ],
                      },
                    },
                  ],
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'StatsSnapshot' },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'RedisStats' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'RedisInfo' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'redis_version' } },
          { kind: 'Field', name: { kind: 'Name', value: 'uptime_in_seconds' } },
          { kind: 'Field', name: { kind: 'Name', value: 'uptime_in_days' } },
          { kind: 'Field', name: { kind: 'Name', value: 'connected_clients' } },
          { kind: 'Field', name: { kind: 'Name', value: 'blocked_clients' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'total_system_memory' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'total_system_memory_human' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'used_memory_human' } },
          { kind: 'Field', name: { kind: 'Name', value: 'used_memory' } },
          { kind: 'Field', name: { kind: 'Name', value: 'used_memory_peak' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'used_memory_peak_human' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'used_memory_lua' } },
          { kind: 'Field', name: { kind: 'Name', value: 'used_cpu_sys' } },
          { kind: 'Field', name: { kind: 'Name', value: 'maxmemory' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'number_of_cached_scripts' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'instantaneous_ops_per_sec' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'mem_fragmentation_ratio' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'role' } },
          { kind: 'Field', name: { kind: 'Name', value: 'os' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tcp_port' } },
          { kind: 'Field', name: { kind: 'Name', value: 'redis_mode' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'StatsSnapshot' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'StatsSnapshot' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'count' } },
          { kind: 'Field', name: { kind: 'Name', value: 'failed' } },
          { kind: 'Field', name: { kind: 'Name', value: 'completed' } },
          { kind: 'Field', name: { kind: 'Name', value: 'startTime' } },
          { kind: 'Field', name: { kind: 'Name', value: 'endTime' } },
          { kind: 'Field', name: { kind: 'Name', value: 'stddev' } },
          { kind: 'Field', name: { kind: 'Name', value: 'mean' } },
          { kind: 'Field', name: { kind: 'Name', value: 'min' } },
          { kind: 'Field', name: { kind: 'Name', value: 'max' } },
          { kind: 'Field', name: { kind: 'Name', value: 'median' } },
          { kind: 'Field', name: { kind: 'Name', value: 'p90' } },
          { kind: 'Field', name: { kind: 'Name', value: 'p95' } },
          { kind: 'Field', name: { kind: 'Name', value: 'p99' } },
          { kind: 'Field', name: { kind: 'Name', value: 'p995' } },
          { kind: 'Field', name: { kind: 'Name', value: 'meanRate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'm1Rate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'm5Rate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'm15Rate' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useHostsPageDataQuery__
 *
 * To run a query within a React component, call `useHostsPageDataQuery` and pass it any options that fit your needs.
 * When your component renders, `useHostsPageDataQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useHostsPageDataQuery({
 *   variables: {
 *      range: // value for 'range'
 *      granularity: // value for 'granularity'
 *   },
 * });
 */
export function useHostsPageDataQuery(
  baseOptions: Apollo.QueryHookOptions<
    HostsPageDataQuery,
    HostsPageDataQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<HostsPageDataQuery, HostsPageDataQueryVariables>(
    HostsPageDataDocument,
    options,
  );
}
export function useHostsPageDataLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    HostsPageDataQuery,
    HostsPageDataQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<HostsPageDataQuery, HostsPageDataQueryVariables>(
    HostsPageDataDocument,
    options,
  );
}
export type HostsPageDataQueryHookResult = ReturnType<
  typeof useHostsPageDataQuery
>;
export type HostsPageDataLazyQueryHookResult = ReturnType<
  typeof useHostsPageDataLazyQuery
>;
export type HostsPageDataQueryResult = Apollo.QueryResult<
  HostsPageDataQuery,
  HostsPageDataQueryVariables
>;
export function refetchHostsPageDataQuery(
  variables: HostsPageDataQueryVariables,
) {
  return { query: HostsPageDataDocument, variables: variables };
}
export const HostOverviewDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'HostOverview' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'range' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'granularity' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'StatsGranularity' },
            },
          },
          defaultValue: { kind: 'EnumValue', value: 'Minute' },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'host' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'redis' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'RedisStats' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'jobCounts' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'active' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'failed' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'paused' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'completed' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'delayed' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'waiting' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'throughput' },
                  arguments: [
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'input' },
                      value: {
                        kind: 'ObjectValue',
                        fields: [
                          {
                            kind: 'ObjectField',
                            name: { kind: 'Name', value: 'range' },
                            value: {
                              kind: 'Variable',
                              name: { kind: 'Name', value: 'range' },
                            },
                          },
                          {
                            kind: 'ObjectField',
                            name: { kind: 'Name', value: 'granularity' },
                            value: {
                              kind: 'Variable',
                              name: { kind: 'Name', value: 'granularity' },
                            },
                          },
                        ],
                      },
                    },
                  ],
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'count' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'm1Rate' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'm5Rate' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'm15Rate' },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'queueCount' } },
                { kind: 'Field', name: { kind: 'Name', value: 'workerCount' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'errorRate' },
                  arguments: [
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'input' },
                      value: {
                        kind: 'ObjectValue',
                        fields: [
                          {
                            kind: 'ObjectField',
                            name: { kind: 'Name', value: 'range' },
                            value: {
                              kind: 'Variable',
                              name: { kind: 'Name', value: 'range' },
                            },
                          },
                          {
                            kind: 'ObjectField',
                            name: { kind: 'Name', value: 'granularity' },
                            value: {
                              kind: 'Variable',
                              name: { kind: 'Name', value: 'granularity' },
                            },
                          },
                        ],
                      },
                    },
                  ],
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'count' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'm1Rate' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'm5Rate' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'm15Rate' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'stats' },
                  arguments: [
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'input' },
                      value: {
                        kind: 'ObjectValue',
                        fields: [
                          {
                            kind: 'ObjectField',
                            name: { kind: 'Name', value: 'range' },
                            value: {
                              kind: 'Variable',
                              name: { kind: 'Name', value: 'range' },
                            },
                          },
                          {
                            kind: 'ObjectField',
                            name: { kind: 'Name', value: 'granularity' },
                            value: {
                              kind: 'Variable',
                              name: { kind: 'Name', value: 'granularity' },
                            },
                          },
                        ],
                      },
                    },
                  ],
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'StatsSnapshot' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'statsAggregate' },
                  arguments: [
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'input' },
                      value: {
                        kind: 'ObjectValue',
                        fields: [
                          {
                            kind: 'ObjectField',
                            name: { kind: 'Name', value: 'range' },
                            value: {
                              kind: 'Variable',
                              name: { kind: 'Name', value: 'range' },
                            },
                          },
                          {
                            kind: 'ObjectField',
                            name: { kind: 'Name', value: 'granularity' },
                            value: {
                              kind: 'Variable',
                              name: { kind: 'Name', value: 'granularity' },
                            },
                          },
                        ],
                      },
                    },
                  ],
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'StatsSnapshot' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'lastStatsSnapshot' },
                  arguments: [
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'input' },
                      value: {
                        kind: 'ObjectValue',
                        fields: [
                          {
                            kind: 'ObjectField',
                            name: { kind: 'Name', value: 'granularity' },
                            value: {
                              kind: 'Variable',
                              name: { kind: 'Name', value: 'granularity' },
                            },
                          },
                        ],
                      },
                    },
                  ],
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'StatsSnapshot' },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'RedisStats' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'RedisInfo' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'redis_version' } },
          { kind: 'Field', name: { kind: 'Name', value: 'uptime_in_seconds' } },
          { kind: 'Field', name: { kind: 'Name', value: 'uptime_in_days' } },
          { kind: 'Field', name: { kind: 'Name', value: 'connected_clients' } },
          { kind: 'Field', name: { kind: 'Name', value: 'blocked_clients' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'total_system_memory' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'total_system_memory_human' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'used_memory_human' } },
          { kind: 'Field', name: { kind: 'Name', value: 'used_memory' } },
          { kind: 'Field', name: { kind: 'Name', value: 'used_memory_peak' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'used_memory_peak_human' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'used_memory_lua' } },
          { kind: 'Field', name: { kind: 'Name', value: 'used_cpu_sys' } },
          { kind: 'Field', name: { kind: 'Name', value: 'maxmemory' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'number_of_cached_scripts' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'instantaneous_ops_per_sec' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'mem_fragmentation_ratio' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'role' } },
          { kind: 'Field', name: { kind: 'Name', value: 'os' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tcp_port' } },
          { kind: 'Field', name: { kind: 'Name', value: 'redis_mode' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'StatsSnapshot' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'StatsSnapshot' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'count' } },
          { kind: 'Field', name: { kind: 'Name', value: 'failed' } },
          { kind: 'Field', name: { kind: 'Name', value: 'completed' } },
          { kind: 'Field', name: { kind: 'Name', value: 'startTime' } },
          { kind: 'Field', name: { kind: 'Name', value: 'endTime' } },
          { kind: 'Field', name: { kind: 'Name', value: 'stddev' } },
          { kind: 'Field', name: { kind: 'Name', value: 'mean' } },
          { kind: 'Field', name: { kind: 'Name', value: 'min' } },
          { kind: 'Field', name: { kind: 'Name', value: 'max' } },
          { kind: 'Field', name: { kind: 'Name', value: 'median' } },
          { kind: 'Field', name: { kind: 'Name', value: 'p90' } },
          { kind: 'Field', name: { kind: 'Name', value: 'p95' } },
          { kind: 'Field', name: { kind: 'Name', value: 'p99' } },
          { kind: 'Field', name: { kind: 'Name', value: 'p995' } },
          { kind: 'Field', name: { kind: 'Name', value: 'meanRate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'm1Rate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'm5Rate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'm15Rate' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useHostOverviewQuery__
 *
 * To run a query within a React component, call `useHostOverviewQuery` and pass it any options that fit your needs.
 * When your component renders, `useHostOverviewQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useHostOverviewQuery({
 *   variables: {
 *      id: // value for 'id'
 *      range: // value for 'range'
 *      granularity: // value for 'granularity'
 *   },
 * });
 */
export function useHostOverviewQuery(
  baseOptions: Apollo.QueryHookOptions<
    HostOverviewQuery,
    HostOverviewQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<HostOverviewQuery, HostOverviewQueryVariables>(
    HostOverviewDocument,
    options,
  );
}
export function useHostOverviewLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    HostOverviewQuery,
    HostOverviewQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<HostOverviewQuery, HostOverviewQueryVariables>(
    HostOverviewDocument,
    options,
  );
}
export type HostOverviewQueryHookResult = ReturnType<
  typeof useHostOverviewQuery
>;
export type HostOverviewLazyQueryHookResult = ReturnType<
  typeof useHostOverviewLazyQuery
>;
export type HostOverviewQueryResult = Apollo.QueryResult<
  HostOverviewQuery,
  HostOverviewQueryVariables
>;
export function refetchHostOverviewQuery(
  variables: HostOverviewQueryVariables,
) {
  return { query: HostOverviewDocument, variables: variables };
}
export const HostWorkersDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'HostWorkers' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'host' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'workers' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'addr' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'age' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'idle' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'started' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'db' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'role' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'workerCount' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useHostWorkersQuery__
 *
 * To run a query within a React component, call `useHostWorkersQuery` and pass it any options that fit your needs.
 * When your component renders, `useHostWorkersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useHostWorkersQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useHostWorkersQuery(
  baseOptions: Apollo.QueryHookOptions<
    HostWorkersQuery,
    HostWorkersQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<HostWorkersQuery, HostWorkersQueryVariables>(
    HostWorkersDocument,
    options,
  );
}
export function useHostWorkersLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    HostWorkersQuery,
    HostWorkersQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<HostWorkersQuery, HostWorkersQueryVariables>(
    HostWorkersDocument,
    options,
  );
}
export type HostWorkersQueryHookResult = ReturnType<typeof useHostWorkersQuery>;
export type HostWorkersLazyQueryHookResult = ReturnType<
  typeof useHostWorkersLazyQuery
>;
export type HostWorkersQueryResult = Apollo.QueryResult<
  HostWorkersQuery,
  HostWorkersQueryVariables
>;
export function refetchHostWorkersQuery(variables: HostWorkersQueryVariables) {
  return { query: HostWorkersDocument, variables: variables };
}
export const GetMetricDataDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetMetricData' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'metricId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'MetricDataInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'metric' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'queueId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'metricId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'metricId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'data' },
                  arguments: [
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'input' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'input' },
                      },
                    },
                  ],
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'ts' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'value' } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useGetMetricDataQuery__
 *
 * To run a query within a React component, call `useGetMetricDataQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMetricDataQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMetricDataQuery({
 *   variables: {
 *      id: // value for 'id'
 *      metricId: // value for 'metricId'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useGetMetricDataQuery(
  baseOptions: Apollo.QueryHookOptions<
    GetMetricDataQuery,
    GetMetricDataQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<GetMetricDataQuery, GetMetricDataQueryVariables>(
    GetMetricDataDocument,
    options,
  );
}
export function useGetMetricDataLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetMetricDataQuery,
    GetMetricDataQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<GetMetricDataQuery, GetMetricDataQueryVariables>(
    GetMetricDataDocument,
    options,
  );
}
export type GetMetricDataQueryHookResult = ReturnType<
  typeof useGetMetricDataQuery
>;
export type GetMetricDataLazyQueryHookResult = ReturnType<
  typeof useGetMetricDataLazyQuery
>;
export type GetMetricDataQueryResult = Apollo.QueryResult<
  GetMetricDataQuery,
  GetMetricDataQueryVariables
>;
export function refetchGetMetricDataQuery(
  variables: GetMetricDataQueryVariables,
) {
  return { query: GetMetricDataDocument, variables: variables };
}
export const GetAvailableMetricsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetAvailableMetrics' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'availableMetrics' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'key' } },
                { kind: 'Field', name: { kind: 'Name', value: 'type' } },
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'unit' } },
                { kind: 'Field', name: { kind: 'Name', value: 'category' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isPolling' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useGetAvailableMetricsQuery__
 *
 * To run a query within a React component, call `useGetAvailableMetricsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAvailableMetricsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetAvailableMetricsQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetAvailableMetricsQuery(
  baseOptions?: Apollo.QueryHookOptions<
    GetAvailableMetricsQuery,
    GetAvailableMetricsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<
    GetAvailableMetricsQuery,
    GetAvailableMetricsQueryVariables
  >(GetAvailableMetricsDocument, options);
}
export function useGetAvailableMetricsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetAvailableMetricsQuery,
    GetAvailableMetricsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<
    GetAvailableMetricsQuery,
    GetAvailableMetricsQueryVariables
  >(GetAvailableMetricsDocument, options);
}
export type GetAvailableMetricsQueryHookResult = ReturnType<
  typeof useGetAvailableMetricsQuery
>;
export type GetAvailableMetricsLazyQueryHookResult = ReturnType<
  typeof useGetAvailableMetricsLazyQuery
>;
export type GetAvailableMetricsQueryResult = Apollo.QueryResult<
  GetAvailableMetricsQuery,
  GetAvailableMetricsQueryVariables
>;
export function refetchGetAvailableMetricsQuery(
  variables?: GetAvailableMetricsQueryVariables,
) {
  return { query: GetAvailableMetricsDocument, variables: variables };
}
export const GetAvailableAggregatesDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetAvailableAggregates' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'aggregates' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'type' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isWindowed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useGetAvailableAggregatesQuery__
 *
 * To run a query within a React component, call `useGetAvailableAggregatesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAvailableAggregatesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetAvailableAggregatesQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetAvailableAggregatesQuery(
  baseOptions?: Apollo.QueryHookOptions<
    GetAvailableAggregatesQuery,
    GetAvailableAggregatesQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<
    GetAvailableAggregatesQuery,
    GetAvailableAggregatesQueryVariables
  >(GetAvailableAggregatesDocument, options);
}
export function useGetAvailableAggregatesLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetAvailableAggregatesQuery,
    GetAvailableAggregatesQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<
    GetAvailableAggregatesQuery,
    GetAvailableAggregatesQueryVariables
  >(GetAvailableAggregatesDocument, options);
}
export type GetAvailableAggregatesQueryHookResult = ReturnType<
  typeof useGetAvailableAggregatesQuery
>;
export type GetAvailableAggregatesLazyQueryHookResult = ReturnType<
  typeof useGetAvailableAggregatesLazyQuery
>;
export type GetAvailableAggregatesQueryResult = Apollo.QueryResult<
  GetAvailableAggregatesQuery,
  GetAvailableAggregatesQueryVariables
>;
export function refetchGetAvailableAggregatesQuery(
  variables?: GetAvailableAggregatesQueryVariables,
) {
  return { query: GetAvailableAggregatesDocument, variables: variables };
}
export const GetMetricByIdDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetMetricById' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'metricId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'metric' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'queueId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'metricId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'metricId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'Metric' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Metric' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'Metric' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'type' } },
          { kind: 'Field', name: { kind: 'Name', value: 'queueId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isActive' } },
          { kind: 'Field', name: { kind: 'Name', value: 'options' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'sampleInterval' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'aggregator' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'type' } },
                { kind: 'Field', name: { kind: 'Name', value: 'options' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'dateRange' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'startTime' } },
                { kind: 'Field', name: { kind: 'Name', value: 'endTime' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useGetMetricByIdQuery__
 *
 * To run a query within a React component, call `useGetMetricByIdQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetMetricByIdQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetMetricByIdQuery({
 *   variables: {
 *      id: // value for 'id'
 *      metricId: // value for 'metricId'
 *   },
 * });
 */
export function useGetMetricByIdQuery(
  baseOptions: Apollo.QueryHookOptions<
    GetMetricByIdQuery,
    GetMetricByIdQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<GetMetricByIdQuery, GetMetricByIdQueryVariables>(
    GetMetricByIdDocument,
    options,
  );
}
export function useGetMetricByIdLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetMetricByIdQuery,
    GetMetricByIdQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<GetMetricByIdQuery, GetMetricByIdQueryVariables>(
    GetMetricByIdDocument,
    options,
  );
}
export type GetMetricByIdQueryHookResult = ReturnType<
  typeof useGetMetricByIdQuery
>;
export type GetMetricByIdLazyQueryHookResult = ReturnType<
  typeof useGetMetricByIdLazyQuery
>;
export type GetMetricByIdQueryResult = Apollo.QueryResult<
  GetMetricByIdQuery,
  GetMetricByIdQueryVariables
>;
export function refetchGetMetricByIdQuery(
  variables: GetMetricByIdQueryVariables,
) {
  return { query: GetMetricByIdDocument, variables: variables };
}
export const CreateMetricDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'CreateMetric' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'CreateMetricInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'createMetric' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'Metric' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Metric' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'Metric' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'type' } },
          { kind: 'Field', name: { kind: 'Name', value: 'queueId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isActive' } },
          { kind: 'Field', name: { kind: 'Name', value: 'options' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'sampleInterval' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'aggregator' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'type' } },
                { kind: 'Field', name: { kind: 'Name', value: 'options' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'dateRange' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'startTime' } },
                { kind: 'Field', name: { kind: 'Name', value: 'endTime' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;
export type CreateMetricMutationFn = Apollo.MutationFunction<
  CreateMetricMutation,
  CreateMetricMutationVariables
>;

/**
 * __useCreateMetricMutation__
 *
 * To run a mutation, you first call `useCreateMetricMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateMetricMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createMetricMutation, { data, loading, error }] = useCreateMetricMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateMetricMutation(
  baseOptions?: Apollo.MutationHookOptions<
    CreateMetricMutation,
    CreateMetricMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    CreateMetricMutation,
    CreateMetricMutationVariables
  >(CreateMetricDocument, options);
}
export type CreateMetricMutationHookResult = ReturnType<
  typeof useCreateMetricMutation
>;
export type CreateMetricMutationResult =
  Apollo.MutationResult<CreateMetricMutation>;
export type CreateMetricMutationOptions = Apollo.BaseMutationOptions<
  CreateMetricMutation,
  CreateMetricMutationVariables
>;
export const UpdateMetricDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'UpdateMetric' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'MetricInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'updateMetric' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'Metric' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Metric' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'Metric' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'type' } },
          { kind: 'Field', name: { kind: 'Name', value: 'queueId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isActive' } },
          { kind: 'Field', name: { kind: 'Name', value: 'options' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'sampleInterval' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'aggregator' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'type' } },
                { kind: 'Field', name: { kind: 'Name', value: 'options' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'dateRange' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'startTime' } },
                { kind: 'Field', name: { kind: 'Name', value: 'endTime' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;
export type UpdateMetricMutationFn = Apollo.MutationFunction<
  UpdateMetricMutation,
  UpdateMetricMutationVariables
>;

/**
 * __useUpdateMetricMutation__
 *
 * To run a mutation, you first call `useUpdateMetricMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateMetricMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateMetricMutation, { data, loading, error }] = useUpdateMetricMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateMetricMutation(
  baseOptions?: Apollo.MutationHookOptions<
    UpdateMetricMutation,
    UpdateMetricMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    UpdateMetricMutation,
    UpdateMetricMutationVariables
  >(UpdateMetricDocument, options);
}
export type UpdateMetricMutationHookResult = ReturnType<
  typeof useUpdateMetricMutation
>;
export type UpdateMetricMutationResult =
  Apollo.MutationResult<UpdateMetricMutation>;
export type UpdateMetricMutationOptions = Apollo.BaseMutationOptions<
  UpdateMetricMutation,
  UpdateMetricMutationVariables
>;
export const DeleteMetricDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'DeleteMetric' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'DeleteMetricInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'deleteMetric' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'isDeleted' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;
export type DeleteMetricMutationFn = Apollo.MutationFunction<
  DeleteMetricMutation,
  DeleteMetricMutationVariables
>;

/**
 * __useDeleteMetricMutation__
 *
 * To run a mutation, you first call `useDeleteMetricMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteMetricMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteMetricMutation, { data, loading, error }] = useDeleteMetricMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useDeleteMetricMutation(
  baseOptions?: Apollo.MutationHookOptions<
    DeleteMetricMutation,
    DeleteMetricMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    DeleteMetricMutation,
    DeleteMetricMutationVariables
  >(DeleteMetricDocument, options);
}
export type DeleteMetricMutationHookResult = ReturnType<
  typeof useDeleteMetricMutation
>;
export type DeleteMetricMutationResult =
  Apollo.MutationResult<DeleteMetricMutation>;
export type DeleteMetricMutationOptions = Apollo.BaseMutationOptions<
  DeleteMetricMutation,
  DeleteMetricMutationVariables
>;
export const GetQueueMetricsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetQueueMetrics' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'queue' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'metrics' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'Metric' },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'metricCount' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Metric' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'Metric' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'type' } },
          { kind: 'Field', name: { kind: 'Name', value: 'queueId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isActive' } },
          { kind: 'Field', name: { kind: 'Name', value: 'options' } },
          { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'updatedAt' } },
          { kind: 'Field', name: { kind: 'Name', value: 'sampleInterval' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'aggregator' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'type' } },
                { kind: 'Field', name: { kind: 'Name', value: 'options' } },
              ],
            },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'dateRange' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'startTime' } },
                { kind: 'Field', name: { kind: 'Name', value: 'endTime' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useGetQueueMetricsQuery__
 *
 * To run a query within a React component, call `useGetQueueMetricsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetQueueMetricsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetQueueMetricsQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetQueueMetricsQuery(
  baseOptions: Apollo.QueryHookOptions<
    GetQueueMetricsQuery,
    GetQueueMetricsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<GetQueueMetricsQuery, GetQueueMetricsQueryVariables>(
    GetQueueMetricsDocument,
    options,
  );
}
export function useGetQueueMetricsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetQueueMetricsQuery,
    GetQueueMetricsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<
    GetQueueMetricsQuery,
    GetQueueMetricsQueryVariables
  >(GetQueueMetricsDocument, options);
}
export type GetQueueMetricsQueryHookResult = ReturnType<
  typeof useGetQueueMetricsQuery
>;
export type GetQueueMetricsLazyQueryHookResult = ReturnType<
  typeof useGetQueueMetricsLazyQuery
>;
export type GetQueueMetricsQueryResult = Apollo.QueryResult<
  GetQueueMetricsQuery,
  GetQueueMetricsQueryVariables
>;
export function refetchGetQueueMetricsQuery(
  variables: GetQueueMetricsQueryVariables,
) {
  return { query: GetQueueMetricsDocument, variables: variables };
}
export const HostsAndQueuesDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'HostsAndQueues' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'hosts' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'uri' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'queues' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'Queue' },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'JobCounts' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'Queue' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'jobCounts' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'active' } },
                { kind: 'Field', name: { kind: 'Name', value: 'failed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'paused' } },
                { kind: 'Field', name: { kind: 'Name', value: 'completed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'delayed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'waiting' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Queue' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'Queue' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'host' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hostId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'prefix' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isPaused' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isReadonly' } },
          {
            kind: 'FragmentSpread',
            name: { kind: 'Name', value: 'JobCounts' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'repeatableJobCount' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'workerCount' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useHostsAndQueuesQuery__
 *
 * To run a query within a React component, call `useHostsAndQueuesQuery` and pass it any options that fit your needs.
 * When your component renders, `useHostsAndQueuesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useHostsAndQueuesQuery({
 *   variables: {
 *   },
 * });
 */
export function useHostsAndQueuesQuery(
  baseOptions?: Apollo.QueryHookOptions<
    HostsAndQueuesQuery,
    HostsAndQueuesQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<HostsAndQueuesQuery, HostsAndQueuesQueryVariables>(
    HostsAndQueuesDocument,
    options,
  );
}
export function useHostsAndQueuesLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    HostsAndQueuesQuery,
    HostsAndQueuesQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<HostsAndQueuesQuery, HostsAndQueuesQueryVariables>(
    HostsAndQueuesDocument,
    options,
  );
}
export type HostsAndQueuesQueryHookResult = ReturnType<
  typeof useHostsAndQueuesQuery
>;
export type HostsAndQueuesLazyQueryHookResult = ReturnType<
  typeof useHostsAndQueuesLazyQuery
>;
export type HostsAndQueuesQueryResult = Apollo.QueryResult<
  HostsAndQueuesQuery,
  HostsAndQueuesQueryVariables
>;
export function refetchHostsAndQueuesQuery(
  variables?: HostsAndQueuesQueryVariables,
) {
  return { query: HostsAndQueuesDocument, variables: variables };
}
export const GetAllHostsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetAllHosts' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'hosts' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'Host' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'RedisStats' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'RedisInfo' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'redis_version' } },
          { kind: 'Field', name: { kind: 'Name', value: 'uptime_in_seconds' } },
          { kind: 'Field', name: { kind: 'Name', value: 'uptime_in_days' } },
          { kind: 'Field', name: { kind: 'Name', value: 'connected_clients' } },
          { kind: 'Field', name: { kind: 'Name', value: 'blocked_clients' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'total_system_memory' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'total_system_memory_human' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'used_memory_human' } },
          { kind: 'Field', name: { kind: 'Name', value: 'used_memory' } },
          { kind: 'Field', name: { kind: 'Name', value: 'used_memory_peak' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'used_memory_peak_human' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'used_memory_lua' } },
          { kind: 'Field', name: { kind: 'Name', value: 'used_cpu_sys' } },
          { kind: 'Field', name: { kind: 'Name', value: 'maxmemory' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'number_of_cached_scripts' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'instantaneous_ops_per_sec' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'mem_fragmentation_ratio' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'role' } },
          { kind: 'Field', name: { kind: 'Name', value: 'os' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tcp_port' } },
          { kind: 'Field', name: { kind: 'Name', value: 'redis_mode' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Host' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'QueueHost' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'uri' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'redis' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'RedisStats' },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useGetAllHostsQuery__
 *
 * To run a query within a React component, call `useGetAllHostsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetAllHostsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetAllHostsQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetAllHostsQuery(
  baseOptions?: Apollo.QueryHookOptions<
    GetAllHostsQuery,
    GetAllHostsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<GetAllHostsQuery, GetAllHostsQueryVariables>(
    GetAllHostsDocument,
    options,
  );
}
export function useGetAllHostsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetAllHostsQuery,
    GetAllHostsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<GetAllHostsQuery, GetAllHostsQueryVariables>(
    GetAllHostsDocument,
    options,
  );
}
export type GetAllHostsQueryHookResult = ReturnType<typeof useGetAllHostsQuery>;
export type GetAllHostsLazyQueryHookResult = ReturnType<
  typeof useGetAllHostsLazyQuery
>;
export type GetAllHostsQueryResult = Apollo.QueryResult<
  GetAllHostsQuery,
  GetAllHostsQueryVariables
>;
export function refetchGetAllHostsQuery(variables?: GetAllHostsQueryVariables) {
  return { query: GetAllHostsDocument, variables: variables };
}
export const GetHostsAndQueuesDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetHostsAndQueues' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'hosts' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'uri' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'redis' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'RedisStats' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'queues' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'Queue' },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'RedisStats' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'RedisInfo' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'redis_version' } },
          { kind: 'Field', name: { kind: 'Name', value: 'uptime_in_seconds' } },
          { kind: 'Field', name: { kind: 'Name', value: 'uptime_in_days' } },
          { kind: 'Field', name: { kind: 'Name', value: 'connected_clients' } },
          { kind: 'Field', name: { kind: 'Name', value: 'blocked_clients' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'total_system_memory' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'total_system_memory_human' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'used_memory_human' } },
          { kind: 'Field', name: { kind: 'Name', value: 'used_memory' } },
          { kind: 'Field', name: { kind: 'Name', value: 'used_memory_peak' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'used_memory_peak_human' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'used_memory_lua' } },
          { kind: 'Field', name: { kind: 'Name', value: 'used_cpu_sys' } },
          { kind: 'Field', name: { kind: 'Name', value: 'maxmemory' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'number_of_cached_scripts' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'instantaneous_ops_per_sec' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'mem_fragmentation_ratio' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'role' } },
          { kind: 'Field', name: { kind: 'Name', value: 'os' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tcp_port' } },
          { kind: 'Field', name: { kind: 'Name', value: 'redis_mode' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'JobCounts' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'Queue' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'jobCounts' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'active' } },
                { kind: 'Field', name: { kind: 'Name', value: 'failed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'paused' } },
                { kind: 'Field', name: { kind: 'Name', value: 'completed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'delayed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'waiting' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Queue' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'Queue' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'host' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hostId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'prefix' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isPaused' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isReadonly' } },
          {
            kind: 'FragmentSpread',
            name: { kind: 'Name', value: 'JobCounts' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'repeatableJobCount' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'workerCount' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useGetHostsAndQueuesQuery__
 *
 * To run a query within a React component, call `useGetHostsAndQueuesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetHostsAndQueuesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetHostsAndQueuesQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetHostsAndQueuesQuery(
  baseOptions?: Apollo.QueryHookOptions<
    GetHostsAndQueuesQuery,
    GetHostsAndQueuesQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<
    GetHostsAndQueuesQuery,
    GetHostsAndQueuesQueryVariables
  >(GetHostsAndQueuesDocument, options);
}
export function useGetHostsAndQueuesLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetHostsAndQueuesQuery,
    GetHostsAndQueuesQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<
    GetHostsAndQueuesQuery,
    GetHostsAndQueuesQueryVariables
  >(GetHostsAndQueuesDocument, options);
}
export type GetHostsAndQueuesQueryHookResult = ReturnType<
  typeof useGetHostsAndQueuesQuery
>;
export type GetHostsAndQueuesLazyQueryHookResult = ReturnType<
  typeof useGetHostsAndQueuesLazyQuery
>;
export type GetHostsAndQueuesQueryResult = Apollo.QueryResult<
  GetHostsAndQueuesQuery,
  GetHostsAndQueuesQueryVariables
>;
export function refetchGetHostsAndQueuesQuery(
  variables?: GetHostsAndQueuesQueryVariables,
) {
  return { query: GetHostsAndQueuesDocument, variables: variables };
}
export const GetHostByIdDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetHostById' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'host' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'Host' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'RedisStats' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'RedisInfo' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'redis_version' } },
          { kind: 'Field', name: { kind: 'Name', value: 'uptime_in_seconds' } },
          { kind: 'Field', name: { kind: 'Name', value: 'uptime_in_days' } },
          { kind: 'Field', name: { kind: 'Name', value: 'connected_clients' } },
          { kind: 'Field', name: { kind: 'Name', value: 'blocked_clients' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'total_system_memory' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'total_system_memory_human' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'used_memory_human' } },
          { kind: 'Field', name: { kind: 'Name', value: 'used_memory' } },
          { kind: 'Field', name: { kind: 'Name', value: 'used_memory_peak' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'used_memory_peak_human' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'used_memory_lua' } },
          { kind: 'Field', name: { kind: 'Name', value: 'used_cpu_sys' } },
          { kind: 'Field', name: { kind: 'Name', value: 'maxmemory' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'number_of_cached_scripts' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'instantaneous_ops_per_sec' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'mem_fragmentation_ratio' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'role' } },
          { kind: 'Field', name: { kind: 'Name', value: 'os' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tcp_port' } },
          { kind: 'Field', name: { kind: 'Name', value: 'redis_mode' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Host' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'QueueHost' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'description' } },
          { kind: 'Field', name: { kind: 'Name', value: 'uri' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'redis' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'RedisStats' },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useGetHostByIdQuery__
 *
 * To run a query within a React component, call `useGetHostByIdQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetHostByIdQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetHostByIdQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetHostByIdQuery(
  baseOptions: Apollo.QueryHookOptions<
    GetHostByIdQuery,
    GetHostByIdQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<GetHostByIdQuery, GetHostByIdQueryVariables>(
    GetHostByIdDocument,
    options,
  );
}
export function useGetHostByIdLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetHostByIdQuery,
    GetHostByIdQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<GetHostByIdQuery, GetHostByIdQueryVariables>(
    GetHostByIdDocument,
    options,
  );
}
export type GetHostByIdQueryHookResult = ReturnType<typeof useGetHostByIdQuery>;
export type GetHostByIdLazyQueryHookResult = ReturnType<
  typeof useGetHostByIdLazyQuery
>;
export type GetHostByIdQueryResult = Apollo.QueryResult<
  GetHostByIdQuery,
  GetHostByIdQueryVariables
>;
export function refetchGetHostByIdQuery(variables: GetHostByIdQueryVariables) {
  return { query: GetHostByIdDocument, variables: variables };
}
export const GetHostByIdFullDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetHostByIdFull' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'host' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                { kind: 'Field', name: { kind: 'Name', value: 'uri' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'redis' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'RedisStats' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'queues' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'Queue' },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'RedisStats' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'RedisInfo' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'redis_version' } },
          { kind: 'Field', name: { kind: 'Name', value: 'uptime_in_seconds' } },
          { kind: 'Field', name: { kind: 'Name', value: 'uptime_in_days' } },
          { kind: 'Field', name: { kind: 'Name', value: 'connected_clients' } },
          { kind: 'Field', name: { kind: 'Name', value: 'blocked_clients' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'total_system_memory' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'total_system_memory_human' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'used_memory_human' } },
          { kind: 'Field', name: { kind: 'Name', value: 'used_memory' } },
          { kind: 'Field', name: { kind: 'Name', value: 'used_memory_peak' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'used_memory_peak_human' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'used_memory_lua' } },
          { kind: 'Field', name: { kind: 'Name', value: 'used_cpu_sys' } },
          { kind: 'Field', name: { kind: 'Name', value: 'maxmemory' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'number_of_cached_scripts' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'instantaneous_ops_per_sec' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'mem_fragmentation_ratio' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'role' } },
          { kind: 'Field', name: { kind: 'Name', value: 'os' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tcp_port' } },
          { kind: 'Field', name: { kind: 'Name', value: 'redis_mode' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'JobCounts' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'Queue' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'jobCounts' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'active' } },
                { kind: 'Field', name: { kind: 'Name', value: 'failed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'paused' } },
                { kind: 'Field', name: { kind: 'Name', value: 'completed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'delayed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'waiting' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Queue' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'Queue' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'host' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hostId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'prefix' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isPaused' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isReadonly' } },
          {
            kind: 'FragmentSpread',
            name: { kind: 'Name', value: 'JobCounts' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'repeatableJobCount' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'workerCount' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useGetHostByIdFullQuery__
 *
 * To run a query within a React component, call `useGetHostByIdFullQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetHostByIdFullQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetHostByIdFullQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetHostByIdFullQuery(
  baseOptions: Apollo.QueryHookOptions<
    GetHostByIdFullQuery,
    GetHostByIdFullQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<GetHostByIdFullQuery, GetHostByIdFullQueryVariables>(
    GetHostByIdFullDocument,
    options,
  );
}
export function useGetHostByIdFullLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetHostByIdFullQuery,
    GetHostByIdFullQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<
    GetHostByIdFullQuery,
    GetHostByIdFullQueryVariables
  >(GetHostByIdFullDocument, options);
}
export type GetHostByIdFullQueryHookResult = ReturnType<
  typeof useGetHostByIdFullQuery
>;
export type GetHostByIdFullLazyQueryHookResult = ReturnType<
  typeof useGetHostByIdFullLazyQuery
>;
export type GetHostByIdFullQueryResult = Apollo.QueryResult<
  GetHostByIdFullQuery,
  GetHostByIdFullQueryVariables
>;
export function refetchGetHostByIdFullQuery(
  variables: GetHostByIdFullQueryVariables,
) {
  return { query: GetHostByIdFullDocument, variables: variables };
}
export const GetHostQueuesDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetHostQueues' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'host' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'queues' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'Queue' },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'JobCounts' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'Queue' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'jobCounts' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'active' } },
                { kind: 'Field', name: { kind: 'Name', value: 'failed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'paused' } },
                { kind: 'Field', name: { kind: 'Name', value: 'completed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'delayed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'waiting' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Queue' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'Queue' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'host' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hostId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'prefix' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isPaused' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isReadonly' } },
          {
            kind: 'FragmentSpread',
            name: { kind: 'Name', value: 'JobCounts' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'repeatableJobCount' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'workerCount' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useGetHostQueuesQuery__
 *
 * To run a query within a React component, call `useGetHostQueuesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetHostQueuesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetHostQueuesQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetHostQueuesQuery(
  baseOptions: Apollo.QueryHookOptions<
    GetHostQueuesQuery,
    GetHostQueuesQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<GetHostQueuesQuery, GetHostQueuesQueryVariables>(
    GetHostQueuesDocument,
    options,
  );
}
export function useGetHostQueuesLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetHostQueuesQuery,
    GetHostQueuesQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<GetHostQueuesQuery, GetHostQueuesQueryVariables>(
    GetHostQueuesDocument,
    options,
  );
}
export type GetHostQueuesQueryHookResult = ReturnType<
  typeof useGetHostQueuesQuery
>;
export type GetHostQueuesLazyQueryHookResult = ReturnType<
  typeof useGetHostQueuesLazyQuery
>;
export type GetHostQueuesQueryResult = Apollo.QueryResult<
  GetHostQueuesQuery,
  GetHostQueuesQueryVariables
>;
export function refetchGetHostQueuesQuery(
  variables: GetHostQueuesQueryVariables,
) {
  return { query: GetHostQueuesDocument, variables: variables };
}
export const HostQueuesDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'HostQueues' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'range' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'filter' },
          },
          type: {
            kind: 'NamedType',
            name: { kind: 'Name', value: 'HostQueuesFilter' },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'host' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'description' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'queues' },
                  arguments: [
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'filter' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'filter' },
                      },
                    },
                  ],
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'isPaused' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'isReadonly' },
                      },
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'JobCounts' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'workerCount' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'throughput' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'count' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'm1Rate' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'm5Rate' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'm15Rate' },
                            },
                          ],
                        },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'errorRate' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'count' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'm1Rate' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'm5Rate' },
                            },
                            {
                              kind: 'Field',
                              name: { kind: 'Name', value: 'm15Rate' },
                            },
                          ],
                        },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'workerCount' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'stats' },
                        arguments: [
                          {
                            kind: 'Argument',
                            name: { kind: 'Name', value: 'input' },
                            value: {
                              kind: 'ObjectValue',
                              fields: [
                                {
                                  kind: 'ObjectField',
                                  name: { kind: 'Name', value: 'range' },
                                  value: {
                                    kind: 'Variable',
                                    name: { kind: 'Name', value: 'range' },
                                  },
                                },
                                {
                                  kind: 'ObjectField',
                                  name: { kind: 'Name', value: 'granularity' },
                                  value: { kind: 'EnumValue', value: 'Minute' },
                                },
                              ],
                            },
                          },
                        ],
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            {
                              kind: 'FragmentSpread',
                              name: { kind: 'Name', value: 'StatsSnapshot' },
                            },
                          ],
                        },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'statsAggregate' },
                        arguments: [
                          {
                            kind: 'Argument',
                            name: { kind: 'Name', value: 'input' },
                            value: {
                              kind: 'ObjectValue',
                              fields: [
                                {
                                  kind: 'ObjectField',
                                  name: { kind: 'Name', value: 'range' },
                                  value: {
                                    kind: 'Variable',
                                    name: { kind: 'Name', value: 'range' },
                                  },
                                },
                                {
                                  kind: 'ObjectField',
                                  name: { kind: 'Name', value: 'granularity' },
                                  value: { kind: 'EnumValue', value: 'Minute' },
                                },
                              ],
                            },
                          },
                        ],
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            {
                              kind: 'FragmentSpread',
                              name: { kind: 'Name', value: 'StatsSnapshot' },
                            },
                          ],
                        },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'lastStatsSnapshot' },
                        arguments: [
                          {
                            kind: 'Argument',
                            name: { kind: 'Name', value: 'input' },
                            value: {
                              kind: 'ObjectValue',
                              fields: [
                                {
                                  kind: 'ObjectField',
                                  name: { kind: 'Name', value: 'granularity' },
                                  value: { kind: 'EnumValue', value: 'Minute' },
                                },
                              ],
                            },
                          },
                        ],
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            {
                              kind: 'FragmentSpread',
                              name: { kind: 'Name', value: 'StatsSnapshot' },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'JobCounts' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'Queue' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'jobCounts' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'active' } },
                { kind: 'Field', name: { kind: 'Name', value: 'failed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'paused' } },
                { kind: 'Field', name: { kind: 'Name', value: 'completed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'delayed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'waiting' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'StatsSnapshot' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'StatsSnapshot' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'count' } },
          { kind: 'Field', name: { kind: 'Name', value: 'failed' } },
          { kind: 'Field', name: { kind: 'Name', value: 'completed' } },
          { kind: 'Field', name: { kind: 'Name', value: 'startTime' } },
          { kind: 'Field', name: { kind: 'Name', value: 'endTime' } },
          { kind: 'Field', name: { kind: 'Name', value: 'stddev' } },
          { kind: 'Field', name: { kind: 'Name', value: 'mean' } },
          { kind: 'Field', name: { kind: 'Name', value: 'min' } },
          { kind: 'Field', name: { kind: 'Name', value: 'max' } },
          { kind: 'Field', name: { kind: 'Name', value: 'median' } },
          { kind: 'Field', name: { kind: 'Name', value: 'p90' } },
          { kind: 'Field', name: { kind: 'Name', value: 'p95' } },
          { kind: 'Field', name: { kind: 'Name', value: 'p99' } },
          { kind: 'Field', name: { kind: 'Name', value: 'p995' } },
          { kind: 'Field', name: { kind: 'Name', value: 'meanRate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'm1Rate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'm5Rate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'm15Rate' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useHostQueuesQuery__
 *
 * To run a query within a React component, call `useHostQueuesQuery` and pass it any options that fit your needs.
 * When your component renders, `useHostQueuesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useHostQueuesQuery({
 *   variables: {
 *      id: // value for 'id'
 *      range: // value for 'range'
 *      filter: // value for 'filter'
 *   },
 * });
 */
export function useHostQueuesQuery(
  baseOptions: Apollo.QueryHookOptions<
    HostQueuesQuery,
    HostQueuesQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<HostQueuesQuery, HostQueuesQueryVariables>(
    HostQueuesDocument,
    options,
  );
}
export function useHostQueuesLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    HostQueuesQuery,
    HostQueuesQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<HostQueuesQuery, HostQueuesQueryVariables>(
    HostQueuesDocument,
    options,
  );
}
export type HostQueuesQueryHookResult = ReturnType<typeof useHostQueuesQuery>;
export type HostQueuesLazyQueryHookResult = ReturnType<
  typeof useHostQueuesLazyQuery
>;
export type HostQueuesQueryResult = Apollo.QueryResult<
  HostQueuesQuery,
  HostQueuesQueryVariables
>;
export function refetchHostQueuesQuery(variables: HostQueuesQueryVariables) {
  return { query: HostQueuesDocument, variables: variables };
}
export const GetRedisStatsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetRedisStats' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'hostId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'host' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'hostId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'redis' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'RedisStats' },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'RedisStats' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'RedisInfo' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'redis_version' } },
          { kind: 'Field', name: { kind: 'Name', value: 'uptime_in_seconds' } },
          { kind: 'Field', name: { kind: 'Name', value: 'uptime_in_days' } },
          { kind: 'Field', name: { kind: 'Name', value: 'connected_clients' } },
          { kind: 'Field', name: { kind: 'Name', value: 'blocked_clients' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'total_system_memory' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'total_system_memory_human' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'used_memory_human' } },
          { kind: 'Field', name: { kind: 'Name', value: 'used_memory' } },
          { kind: 'Field', name: { kind: 'Name', value: 'used_memory_peak' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'used_memory_peak_human' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'used_memory_lua' } },
          { kind: 'Field', name: { kind: 'Name', value: 'used_cpu_sys' } },
          { kind: 'Field', name: { kind: 'Name', value: 'maxmemory' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'number_of_cached_scripts' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'instantaneous_ops_per_sec' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'mem_fragmentation_ratio' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'role' } },
          { kind: 'Field', name: { kind: 'Name', value: 'os' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tcp_port' } },
          { kind: 'Field', name: { kind: 'Name', value: 'redis_mode' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useGetRedisStatsQuery__
 *
 * To run a query within a React component, call `useGetRedisStatsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetRedisStatsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetRedisStatsQuery({
 *   variables: {
 *      hostId: // value for 'hostId'
 *   },
 * });
 */
export function useGetRedisStatsQuery(
  baseOptions: Apollo.QueryHookOptions<
    GetRedisStatsQuery,
    GetRedisStatsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<GetRedisStatsQuery, GetRedisStatsQueryVariables>(
    GetRedisStatsDocument,
    options,
  );
}
export function useGetRedisStatsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetRedisStatsQuery,
    GetRedisStatsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<GetRedisStatsQuery, GetRedisStatsQueryVariables>(
    GetRedisStatsDocument,
    options,
  );
}
export type GetRedisStatsQueryHookResult = ReturnType<
  typeof useGetRedisStatsQuery
>;
export type GetRedisStatsLazyQueryHookResult = ReturnType<
  typeof useGetRedisStatsLazyQuery
>;
export type GetRedisStatsQueryResult = Apollo.QueryResult<
  GetRedisStatsQuery,
  GetRedisStatsQueryVariables
>;
export function refetchGetRedisStatsQuery(
  variables: GetRedisStatsQueryVariables,
) {
  return { query: GetRedisStatsDocument, variables: variables };
}
export const DiscoverQueuesDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'discoverQueues' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'hostId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'prefix' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'unregisteredOnly' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Boolean' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'host' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'hostId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'discoverQueues' },
                  arguments: [
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'prefix' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'prefix' },
                      },
                    },
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'unregisteredOnly' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'unregisteredOnly' },
                      },
                    },
                  ],
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'prefix' },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useDiscoverQueuesQuery__
 *
 * To run a query within a React component, call `useDiscoverQueuesQuery` and pass it any options that fit your needs.
 * When your component renders, `useDiscoverQueuesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useDiscoverQueuesQuery({
 *   variables: {
 *      hostId: // value for 'hostId'
 *      prefix: // value for 'prefix'
 *      unregisteredOnly: // value for 'unregisteredOnly'
 *   },
 * });
 */
export function useDiscoverQueuesQuery(
  baseOptions: Apollo.QueryHookOptions<
    DiscoverQueuesQuery,
    DiscoverQueuesQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<DiscoverQueuesQuery, DiscoverQueuesQueryVariables>(
    DiscoverQueuesDocument,
    options,
  );
}
export function useDiscoverQueuesLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    DiscoverQueuesQuery,
    DiscoverQueuesQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<DiscoverQueuesQuery, DiscoverQueuesQueryVariables>(
    DiscoverQueuesDocument,
    options,
  );
}
export type DiscoverQueuesQueryHookResult = ReturnType<
  typeof useDiscoverQueuesQuery
>;
export type DiscoverQueuesLazyQueryHookResult = ReturnType<
  typeof useDiscoverQueuesLazyQuery
>;
export type DiscoverQueuesQueryResult = Apollo.QueryResult<
  DiscoverQueuesQuery,
  DiscoverQueuesQueryVariables
>;
export function refetchDiscoverQueuesQuery(
  variables: DiscoverQueuesQueryVariables,
) {
  return { query: DiscoverQueuesDocument, variables: variables };
}
export const RegisterQueueDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'RegisterQueue' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'hostId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'name' } },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'prefix' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'checkExists' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Boolean' } },
          defaultValue: { kind: 'BooleanValue', value: false },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'registerQueue' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'ObjectValue',
                  fields: [
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'hostId' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'hostId' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'name' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'name' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'prefix' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'prefix' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'checkExists' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'checkExists' },
                      },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: '__typename' } },
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'Queue' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'JobCounts' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'Queue' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'jobCounts' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'active' } },
                { kind: 'Field', name: { kind: 'Name', value: 'failed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'paused' } },
                { kind: 'Field', name: { kind: 'Name', value: 'completed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'delayed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'waiting' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Queue' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'Queue' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'host' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hostId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'prefix' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isPaused' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isReadonly' } },
          {
            kind: 'FragmentSpread',
            name: { kind: 'Name', value: 'JobCounts' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'repeatableJobCount' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'workerCount' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode;
export type RegisterQueueMutationFn = Apollo.MutationFunction<
  RegisterQueueMutation,
  RegisterQueueMutationVariables
>;

/**
 * __useRegisterQueueMutation__
 *
 * To run a mutation, you first call `useRegisterQueueMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRegisterQueueMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [registerQueueMutation, { data, loading, error }] = useRegisterQueueMutation({
 *   variables: {
 *      hostId: // value for 'hostId'
 *      name: // value for 'name'
 *      prefix: // value for 'prefix'
 *      checkExists: // value for 'checkExists'
 *   },
 * });
 */
export function useRegisterQueueMutation(
  baseOptions?: Apollo.MutationHookOptions<
    RegisterQueueMutation,
    RegisterQueueMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    RegisterQueueMutation,
    RegisterQueueMutationVariables
  >(RegisterQueueDocument, options);
}
export type RegisterQueueMutationHookResult = ReturnType<
  typeof useRegisterQueueMutation
>;
export type RegisterQueueMutationResult =
  Apollo.MutationResult<RegisterQueueMutation>;
export type RegisterQueueMutationOptions = Apollo.BaseMutationOptions<
  RegisterQueueMutation,
  RegisterQueueMutationVariables
>;
export const UnregisterQueueDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'UnregisterQueue' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'unregisterQueue' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'host' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'isRemoved' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;
export type UnregisterQueueMutationFn = Apollo.MutationFunction<
  UnregisterQueueMutation,
  UnregisterQueueMutationVariables
>;

/**
 * __useUnregisterQueueMutation__
 *
 * To run a mutation, you first call `useUnregisterQueueMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUnregisterQueueMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [unregisterQueueMutation, { data, loading, error }] = useUnregisterQueueMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useUnregisterQueueMutation(
  baseOptions?: Apollo.MutationHookOptions<
    UnregisterQueueMutation,
    UnregisterQueueMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    UnregisterQueueMutation,
    UnregisterQueueMutationVariables
  >(UnregisterQueueDocument, options);
}
export type UnregisterQueueMutationHookResult = ReturnType<
  typeof useUnregisterQueueMutation
>;
export type UnregisterQueueMutationResult =
  Apollo.MutationResult<UnregisterQueueMutation>;
export type UnregisterQueueMutationOptions = Apollo.BaseMutationOptions<
  UnregisterQueueMutation,
  UnregisterQueueMutationVariables
>;
export const FindJobsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'FindJobs' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'queueId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'status' },
          },
          type: {
            kind: 'NamedType',
            name: { kind: 'Name', value: 'JobSearchStatus' },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'criteria' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'cursor' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'limit' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
          defaultValue: { kind: 'IntValue', value: '10' },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'findJobs' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'ObjectValue',
                  fields: [
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'queueId' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'queueId' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'scanCount' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'limit' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'expression' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'criteria' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'status' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'status' },
                      },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'nextCursor' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'jobs' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'Job' },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'JobRepeatOptions' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'JobRepeatOptions' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'cron' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tz' } },
          { kind: 'Field', name: { kind: 'Name', value: 'startDate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'endDate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'limit' } },
          { kind: 'Field', name: { kind: 'Name', value: 'every' } },
          { kind: 'Field', name: { kind: 'Name', value: 'jobId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'count' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'JobOptions' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'JobOptions' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'timestamp' } },
          { kind: 'Field', name: { kind: 'Name', value: 'priority' } },
          { kind: 'Field', name: { kind: 'Name', value: 'delay' } },
          { kind: 'Field', name: { kind: 'Name', value: 'attempts' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'repeat' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'JobRepeatOptions' },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'backoff' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lifo' } },
          { kind: 'Field', name: { kind: 'Name', value: 'timeout' } },
          { kind: 'Field', name: { kind: 'Name', value: 'jobId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'removeOnComplete' } },
          { kind: 'Field', name: { kind: 'Name', value: 'removeOnFail' } },
          { kind: 'Field', name: { kind: 'Name', value: 'stackTraceLimit' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Job' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'Job' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'queueId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'timestamp' } },
          { kind: 'Field', name: { kind: 'Name', value: 'state' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'data' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'opts' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'JobOptions' },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'delay' } },
          { kind: 'Field', name: { kind: 'Name', value: 'progress' } },
          { kind: 'Field', name: { kind: 'Name', value: 'attemptsMade' } },
          { kind: 'Field', name: { kind: 'Name', value: 'processedOn' } },
          { kind: 'Field', name: { kind: 'Name', value: 'finishedOn' } },
          { kind: 'Field', name: { kind: 'Name', value: 'failedReason' } },
          { kind: 'Field', name: { kind: 'Name', value: 'stacktrace' } },
          { kind: 'Field', name: { kind: 'Name', value: 'returnvalue' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useFindJobsQuery__
 *
 * To run a query within a React component, call `useFindJobsQuery` and pass it any options that fit your needs.
 * When your component renders, `useFindJobsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useFindJobsQuery({
 *   variables: {
 *      queueId: // value for 'queueId'
 *      status: // value for 'status'
 *      criteria: // value for 'criteria'
 *      cursor: // value for 'cursor'
 *      limit: // value for 'limit'
 *   },
 * });
 */
export function useFindJobsQuery(
  baseOptions: Apollo.QueryHookOptions<FindJobsQuery, FindJobsQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<FindJobsQuery, FindJobsQueryVariables>(
    FindJobsDocument,
    options,
  );
}
export function useFindJobsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    FindJobsQuery,
    FindJobsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<FindJobsQuery, FindJobsQueryVariables>(
    FindJobsDocument,
    options,
  );
}
export type FindJobsQueryHookResult = ReturnType<typeof useFindJobsQuery>;
export type FindJobsLazyQueryHookResult = ReturnType<
  typeof useFindJobsLazyQuery
>;
export type FindJobsQueryResult = Apollo.QueryResult<
  FindJobsQuery,
  FindJobsQueryVariables
>;
export function refetchFindJobsQuery(variables: FindJobsQueryVariables) {
  return { query: FindJobsDocument, variables: variables };
}
export const GetJobsByFilterDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetJobsByFilter' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'queueId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'status' },
          },
          type: {
            kind: 'NamedType',
            name: { kind: 'Name', value: 'JobSearchStatus' },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'cursor' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
          defaultValue: { kind: 'StringValue', value: '', block: false },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'criteria' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'count' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
          defaultValue: { kind: 'IntValue', value: '10' },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'pattern' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'queue' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'queueId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'jobsByFilter' },
                  arguments: [
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'input' },
                      value: {
                        kind: 'ObjectValue',
                        fields: [
                          {
                            kind: 'ObjectField',
                            name: { kind: 'Name', value: 'cursor' },
                            value: {
                              kind: 'Variable',
                              name: { kind: 'Name', value: 'cursor' },
                            },
                          },
                          {
                            kind: 'ObjectField',
                            name: { kind: 'Name', value: 'count' },
                            value: {
                              kind: 'Variable',
                              name: { kind: 'Name', value: 'count' },
                            },
                          },
                          {
                            kind: 'ObjectField',
                            name: { kind: 'Name', value: 'status' },
                            value: {
                              kind: 'Variable',
                              name: { kind: 'Name', value: 'status' },
                            },
                          },
                          {
                            kind: 'ObjectField',
                            name: { kind: 'Name', value: 'expression' },
                            value: {
                              kind: 'Variable',
                              name: { kind: 'Name', value: 'criteria' },
                            },
                          },
                          {
                            kind: 'ObjectField',
                            name: { kind: 'Name', value: 'pattern' },
                            value: {
                              kind: 'Variable',
                              name: { kind: 'Name', value: 'pattern' },
                            },
                          },
                        ],
                      },
                    },
                  ],
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'cursor' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'total' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'current' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'jobs' },
                        selectionSet: {
                          kind: 'SelectionSet',
                          selections: [
                            {
                              kind: 'FragmentSpread',
                              name: { kind: 'Name', value: 'Job' },
                            },
                          ],
                        },
                      },
                    ],
                  },
                },
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'JobCounts' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'JobRepeatOptions' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'JobRepeatOptions' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'cron' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tz' } },
          { kind: 'Field', name: { kind: 'Name', value: 'startDate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'endDate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'limit' } },
          { kind: 'Field', name: { kind: 'Name', value: 'every' } },
          { kind: 'Field', name: { kind: 'Name', value: 'jobId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'count' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'JobOptions' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'JobOptions' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'timestamp' } },
          { kind: 'Field', name: { kind: 'Name', value: 'priority' } },
          { kind: 'Field', name: { kind: 'Name', value: 'delay' } },
          { kind: 'Field', name: { kind: 'Name', value: 'attempts' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'repeat' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'JobRepeatOptions' },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'backoff' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lifo' } },
          { kind: 'Field', name: { kind: 'Name', value: 'timeout' } },
          { kind: 'Field', name: { kind: 'Name', value: 'jobId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'removeOnComplete' } },
          { kind: 'Field', name: { kind: 'Name', value: 'removeOnFail' } },
          { kind: 'Field', name: { kind: 'Name', value: 'stackTraceLimit' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Job' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'Job' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'queueId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'timestamp' } },
          { kind: 'Field', name: { kind: 'Name', value: 'state' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'data' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'opts' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'JobOptions' },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'delay' } },
          { kind: 'Field', name: { kind: 'Name', value: 'progress' } },
          { kind: 'Field', name: { kind: 'Name', value: 'attemptsMade' } },
          { kind: 'Field', name: { kind: 'Name', value: 'processedOn' } },
          { kind: 'Field', name: { kind: 'Name', value: 'finishedOn' } },
          { kind: 'Field', name: { kind: 'Name', value: 'failedReason' } },
          { kind: 'Field', name: { kind: 'Name', value: 'stacktrace' } },
          { kind: 'Field', name: { kind: 'Name', value: 'returnvalue' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'JobCounts' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'Queue' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'jobCounts' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'active' } },
                { kind: 'Field', name: { kind: 'Name', value: 'failed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'paused' } },
                { kind: 'Field', name: { kind: 'Name', value: 'completed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'delayed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'waiting' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useGetJobsByFilterQuery__
 *
 * To run a query within a React component, call `useGetJobsByFilterQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetJobsByFilterQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetJobsByFilterQuery({
 *   variables: {
 *      queueId: // value for 'queueId'
 *      status: // value for 'status'
 *      cursor: // value for 'cursor'
 *      criteria: // value for 'criteria'
 *      count: // value for 'count'
 *      pattern: // value for 'pattern'
 *   },
 * });
 */
export function useGetJobsByFilterQuery(
  baseOptions: Apollo.QueryHookOptions<
    GetJobsByFilterQuery,
    GetJobsByFilterQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<GetJobsByFilterQuery, GetJobsByFilterQueryVariables>(
    GetJobsByFilterDocument,
    options,
  );
}
export function useGetJobsByFilterLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetJobsByFilterQuery,
    GetJobsByFilterQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<
    GetJobsByFilterQuery,
    GetJobsByFilterQueryVariables
  >(GetJobsByFilterDocument, options);
}
export type GetJobsByFilterQueryHookResult = ReturnType<
  typeof useGetJobsByFilterQuery
>;
export type GetJobsByFilterLazyQueryHookResult = ReturnType<
  typeof useGetJobsByFilterLazyQuery
>;
export type GetJobsByFilterQueryResult = Apollo.QueryResult<
  GetJobsByFilterQuery,
  GetJobsByFilterQueryVariables
>;
export function refetchGetJobsByFilterQuery(
  variables: GetJobsByFilterQueryVariables,
) {
  return { query: GetJobsByFilterDocument, variables: variables };
}
export const GetJobsByIdDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetJobsById' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'queueId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'ids' } },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'ListType',
              type: {
                kind: 'NonNullType',
                type: {
                  kind: 'NamedType',
                  name: { kind: 'Name', value: 'ID' },
                },
              },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'getJobsById' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'ObjectValue',
                  fields: [
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'queueId' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'queueId' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'ids' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'ids' },
                      },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'Job' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'JobRepeatOptions' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'JobRepeatOptions' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'cron' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tz' } },
          { kind: 'Field', name: { kind: 'Name', value: 'startDate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'endDate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'limit' } },
          { kind: 'Field', name: { kind: 'Name', value: 'every' } },
          { kind: 'Field', name: { kind: 'Name', value: 'jobId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'count' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'JobOptions' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'JobOptions' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'timestamp' } },
          { kind: 'Field', name: { kind: 'Name', value: 'priority' } },
          { kind: 'Field', name: { kind: 'Name', value: 'delay' } },
          { kind: 'Field', name: { kind: 'Name', value: 'attempts' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'repeat' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'JobRepeatOptions' },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'backoff' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lifo' } },
          { kind: 'Field', name: { kind: 'Name', value: 'timeout' } },
          { kind: 'Field', name: { kind: 'Name', value: 'jobId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'removeOnComplete' } },
          { kind: 'Field', name: { kind: 'Name', value: 'removeOnFail' } },
          { kind: 'Field', name: { kind: 'Name', value: 'stackTraceLimit' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Job' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'Job' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'queueId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'timestamp' } },
          { kind: 'Field', name: { kind: 'Name', value: 'state' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'data' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'opts' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'JobOptions' },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'delay' } },
          { kind: 'Field', name: { kind: 'Name', value: 'progress' } },
          { kind: 'Field', name: { kind: 'Name', value: 'attemptsMade' } },
          { kind: 'Field', name: { kind: 'Name', value: 'processedOn' } },
          { kind: 'Field', name: { kind: 'Name', value: 'finishedOn' } },
          { kind: 'Field', name: { kind: 'Name', value: 'failedReason' } },
          { kind: 'Field', name: { kind: 'Name', value: 'stacktrace' } },
          { kind: 'Field', name: { kind: 'Name', value: 'returnvalue' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useGetJobsByIdQuery__
 *
 * To run a query within a React component, call `useGetJobsByIdQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetJobsByIdQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetJobsByIdQuery({
 *   variables: {
 *      queueId: // value for 'queueId'
 *      ids: // value for 'ids'
 *   },
 * });
 */
export function useGetJobsByIdQuery(
  baseOptions: Apollo.QueryHookOptions<
    GetJobsByIdQuery,
    GetJobsByIdQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<GetJobsByIdQuery, GetJobsByIdQueryVariables>(
    GetJobsByIdDocument,
    options,
  );
}
export function useGetJobsByIdLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetJobsByIdQuery,
    GetJobsByIdQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<GetJobsByIdQuery, GetJobsByIdQueryVariables>(
    GetJobsByIdDocument,
    options,
  );
}
export type GetJobsByIdQueryHookResult = ReturnType<typeof useGetJobsByIdQuery>;
export type GetJobsByIdLazyQueryHookResult = ReturnType<
  typeof useGetJobsByIdLazyQuery
>;
export type GetJobsByIdQueryResult = Apollo.QueryResult<
  GetJobsByIdQuery,
  GetJobsByIdQueryVariables
>;
export function refetchGetJobsByIdQuery(variables: GetJobsByIdQueryVariables) {
  return { query: GetJobsByIdDocument, variables: variables };
}
export const GetJobFiltersDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetJobFilters' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'queueId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'ids' } },
          type: {
            kind: 'ListType',
            type: {
              kind: 'NonNullType',
              type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'queue' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'queueId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'jobFilters' },
                  arguments: [
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'ids' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'ids' },
                      },
                    },
                  ],
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'expression' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'pattern' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'status' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'createdAt' },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useGetJobFiltersQuery__
 *
 * To run a query within a React component, call `useGetJobFiltersQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetJobFiltersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetJobFiltersQuery({
 *   variables: {
 *      queueId: // value for 'queueId'
 *      ids: // value for 'ids'
 *   },
 * });
 */
export function useGetJobFiltersQuery(
  baseOptions: Apollo.QueryHookOptions<
    GetJobFiltersQuery,
    GetJobFiltersQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<GetJobFiltersQuery, GetJobFiltersQueryVariables>(
    GetJobFiltersDocument,
    options,
  );
}
export function useGetJobFiltersLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetJobFiltersQuery,
    GetJobFiltersQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<GetJobFiltersQuery, GetJobFiltersQueryVariables>(
    GetJobFiltersDocument,
    options,
  );
}
export type GetJobFiltersQueryHookResult = ReturnType<
  typeof useGetJobFiltersQuery
>;
export type GetJobFiltersLazyQueryHookResult = ReturnType<
  typeof useGetJobFiltersLazyQuery
>;
export type GetJobFiltersQueryResult = Apollo.QueryResult<
  GetJobFiltersQuery,
  GetJobFiltersQueryVariables
>;
export function refetchGetJobFiltersQuery(
  variables: GetJobFiltersQueryVariables,
) {
  return { query: GetJobFiltersDocument, variables: variables };
}
export const CreateJobFilterDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'CreateJobFilter' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'CreateJobFilterInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'createJobFilter' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'expression' } },
                { kind: 'Field', name: { kind: 'Name', value: 'createdAt' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;
export type CreateJobFilterMutationFn = Apollo.MutationFunction<
  CreateJobFilterMutation,
  CreateJobFilterMutationVariables
>;

/**
 * __useCreateJobFilterMutation__
 *
 * To run a mutation, you first call `useCreateJobFilterMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateJobFilterMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createJobFilterMutation, { data, loading, error }] = useCreateJobFilterMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useCreateJobFilterMutation(
  baseOptions?: Apollo.MutationHookOptions<
    CreateJobFilterMutation,
    CreateJobFilterMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    CreateJobFilterMutation,
    CreateJobFilterMutationVariables
  >(CreateJobFilterDocument, options);
}
export type CreateJobFilterMutationHookResult = ReturnType<
  typeof useCreateJobFilterMutation
>;
export type CreateJobFilterMutationResult =
  Apollo.MutationResult<CreateJobFilterMutation>;
export type CreateJobFilterMutationOptions = Apollo.BaseMutationOptions<
  CreateJobFilterMutation,
  CreateJobFilterMutationVariables
>;
export const UpdateJobFilterDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'UpdateJobFilter' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'UpdateJobFilterInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'updateJobFilter' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'filter' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'expression' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'createdAt' },
                      },
                    ],
                  },
                },
                { kind: 'Field', name: { kind: 'Name', value: 'isUpdated' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;
export type UpdateJobFilterMutationFn = Apollo.MutationFunction<
  UpdateJobFilterMutation,
  UpdateJobFilterMutationVariables
>;

/**
 * __useUpdateJobFilterMutation__
 *
 * To run a mutation, you first call `useUpdateJobFilterMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateJobFilterMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateJobFilterMutation, { data, loading, error }] = useUpdateJobFilterMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateJobFilterMutation(
  baseOptions?: Apollo.MutationHookOptions<
    UpdateJobFilterMutation,
    UpdateJobFilterMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    UpdateJobFilterMutation,
    UpdateJobFilterMutationVariables
  >(UpdateJobFilterDocument, options);
}
export type UpdateJobFilterMutationHookResult = ReturnType<
  typeof useUpdateJobFilterMutation
>;
export type UpdateJobFilterMutationResult =
  Apollo.MutationResult<UpdateJobFilterMutation>;
export type UpdateJobFilterMutationOptions = Apollo.BaseMutationOptions<
  UpdateJobFilterMutation,
  UpdateJobFilterMutationVariables
>;
export const DeleteJobFilterDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'DeleteJobFilter' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'DeleteJobFilterInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'deleteJobFilter' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'isDeleted' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;
export type DeleteJobFilterMutationFn = Apollo.MutationFunction<
  DeleteJobFilterMutation,
  DeleteJobFilterMutationVariables
>;

/**
 * __useDeleteJobFilterMutation__
 *
 * To run a mutation, you first call `useDeleteJobFilterMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteJobFilterMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteJobFilterMutation, { data, loading, error }] = useDeleteJobFilterMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useDeleteJobFilterMutation(
  baseOptions?: Apollo.MutationHookOptions<
    DeleteJobFilterMutation,
    DeleteJobFilterMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    DeleteJobFilterMutation,
    DeleteJobFilterMutationVariables
  >(DeleteJobFilterDocument, options);
}
export type DeleteJobFilterMutationHookResult = ReturnType<
  typeof useDeleteJobFilterMutation
>;
export type DeleteJobFilterMutationResult =
  Apollo.MutationResult<DeleteJobFilterMutation>;
export type DeleteJobFilterMutationOptions = Apollo.BaseMutationOptions<
  DeleteJobFilterMutation,
  DeleteJobFilterMutationVariables
>;
export const GetQueueJobCountsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetQueueJobCounts' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'queueId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'queue' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'queueId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'JobCounts' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'JobCounts' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'Queue' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'jobCounts' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'active' } },
                { kind: 'Field', name: { kind: 'Name', value: 'failed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'paused' } },
                { kind: 'Field', name: { kind: 'Name', value: 'completed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'delayed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'waiting' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useGetQueueJobCountsQuery__
 *
 * To run a query within a React component, call `useGetQueueJobCountsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetQueueJobCountsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetQueueJobCountsQuery({
 *   variables: {
 *      queueId: // value for 'queueId'
 *   },
 * });
 */
export function useGetQueueJobCountsQuery(
  baseOptions: Apollo.QueryHookOptions<
    GetQueueJobCountsQuery,
    GetQueueJobCountsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<
    GetQueueJobCountsQuery,
    GetQueueJobCountsQueryVariables
  >(GetQueueJobCountsDocument, options);
}
export function useGetQueueJobCountsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetQueueJobCountsQuery,
    GetQueueJobCountsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<
    GetQueueJobCountsQuery,
    GetQueueJobCountsQueryVariables
  >(GetQueueJobCountsDocument, options);
}
export type GetQueueJobCountsQueryHookResult = ReturnType<
  typeof useGetQueueJobCountsQuery
>;
export type GetQueueJobCountsLazyQueryHookResult = ReturnType<
  typeof useGetQueueJobCountsLazyQuery
>;
export type GetQueueJobCountsQueryResult = Apollo.QueryResult<
  GetQueueJobCountsQuery,
  GetQueueJobCountsQueryVariables
>;
export function refetchGetQueueJobCountsQuery(
  variables: GetQueueJobCountsQueryVariables,
) {
  return { query: GetQueueJobCountsDocument, variables: variables };
}
export const GetQueueJobsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetQueueJobs' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'queueId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'offset' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
          defaultValue: { kind: 'IntValue', value: '0' },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'limit' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
          defaultValue: { kind: 'IntValue', value: '10' },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'status' },
          },
          type: {
            kind: 'NamedType',
            name: { kind: 'Name', value: 'JobSearchStatus' },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'sortOrder' },
          },
          type: {
            kind: 'NamedType',
            name: { kind: 'Name', value: 'SortOrderEnum' },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'queue' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'queueId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'jobs' },
                  arguments: [
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'input' },
                      value: {
                        kind: 'ObjectValue',
                        fields: [
                          {
                            kind: 'ObjectField',
                            name: { kind: 'Name', value: 'offset' },
                            value: {
                              kind: 'Variable',
                              name: { kind: 'Name', value: 'offset' },
                            },
                          },
                          {
                            kind: 'ObjectField',
                            name: { kind: 'Name', value: 'limit' },
                            value: {
                              kind: 'Variable',
                              name: { kind: 'Name', value: 'limit' },
                            },
                          },
                          {
                            kind: 'ObjectField',
                            name: { kind: 'Name', value: 'status' },
                            value: {
                              kind: 'Variable',
                              name: { kind: 'Name', value: 'status' },
                            },
                          },
                          {
                            kind: 'ObjectField',
                            name: { kind: 'Name', value: 'sortOrder' },
                            value: {
                              kind: 'Variable',
                              name: { kind: 'Name', value: 'sortOrder' },
                            },
                          },
                        ],
                      },
                    },
                  ],
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'Job' },
                      },
                    ],
                  },
                },
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'JobCounts' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'JobRepeatOptions' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'JobRepeatOptions' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'cron' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tz' } },
          { kind: 'Field', name: { kind: 'Name', value: 'startDate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'endDate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'limit' } },
          { kind: 'Field', name: { kind: 'Name', value: 'every' } },
          { kind: 'Field', name: { kind: 'Name', value: 'jobId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'count' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'JobOptions' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'JobOptions' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'timestamp' } },
          { kind: 'Field', name: { kind: 'Name', value: 'priority' } },
          { kind: 'Field', name: { kind: 'Name', value: 'delay' } },
          { kind: 'Field', name: { kind: 'Name', value: 'attempts' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'repeat' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'JobRepeatOptions' },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'backoff' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lifo' } },
          { kind: 'Field', name: { kind: 'Name', value: 'timeout' } },
          { kind: 'Field', name: { kind: 'Name', value: 'jobId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'removeOnComplete' } },
          { kind: 'Field', name: { kind: 'Name', value: 'removeOnFail' } },
          { kind: 'Field', name: { kind: 'Name', value: 'stackTraceLimit' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Job' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'Job' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'queueId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'timestamp' } },
          { kind: 'Field', name: { kind: 'Name', value: 'state' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'data' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'opts' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'JobOptions' },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'delay' } },
          { kind: 'Field', name: { kind: 'Name', value: 'progress' } },
          { kind: 'Field', name: { kind: 'Name', value: 'attemptsMade' } },
          { kind: 'Field', name: { kind: 'Name', value: 'processedOn' } },
          { kind: 'Field', name: { kind: 'Name', value: 'finishedOn' } },
          { kind: 'Field', name: { kind: 'Name', value: 'failedReason' } },
          { kind: 'Field', name: { kind: 'Name', value: 'stacktrace' } },
          { kind: 'Field', name: { kind: 'Name', value: 'returnvalue' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'JobCounts' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'Queue' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'jobCounts' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'active' } },
                { kind: 'Field', name: { kind: 'Name', value: 'failed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'paused' } },
                { kind: 'Field', name: { kind: 'Name', value: 'completed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'delayed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'waiting' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useGetQueueJobsQuery__
 *
 * To run a query within a React component, call `useGetQueueJobsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetQueueJobsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetQueueJobsQuery({
 *   variables: {
 *      queueId: // value for 'queueId'
 *      offset: // value for 'offset'
 *      limit: // value for 'limit'
 *      status: // value for 'status'
 *      sortOrder: // value for 'sortOrder'
 *   },
 * });
 */
export function useGetQueueJobsQuery(
  baseOptions: Apollo.QueryHookOptions<
    GetQueueJobsQuery,
    GetQueueJobsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<GetQueueJobsQuery, GetQueueJobsQueryVariables>(
    GetQueueJobsDocument,
    options,
  );
}
export function useGetQueueJobsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetQueueJobsQuery,
    GetQueueJobsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<GetQueueJobsQuery, GetQueueJobsQueryVariables>(
    GetQueueJobsDocument,
    options,
  );
}
export type GetQueueJobsQueryHookResult = ReturnType<
  typeof useGetQueueJobsQuery
>;
export type GetQueueJobsLazyQueryHookResult = ReturnType<
  typeof useGetQueueJobsLazyQuery
>;
export type GetQueueJobsQueryResult = Apollo.QueryResult<
  GetQueueJobsQuery,
  GetQueueJobsQueryVariables
>;
export function refetchGetQueueJobsQuery(
  variables: GetQueueJobsQueryVariables,
) {
  return { query: GetQueueJobsDocument, variables: variables };
}
export const GetJobsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetJobs' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'queueId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'offset' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
          defaultValue: { kind: 'IntValue', value: '0' },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'limit' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
          defaultValue: { kind: 'IntValue', value: '10' },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'status' },
          },
          type: {
            kind: 'NamedType',
            name: { kind: 'Name', value: 'JobState' },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'sortOrder' },
          },
          type: {
            kind: 'NamedType',
            name: { kind: 'Name', value: 'SortOrderEnum' },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'getJobs' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'ObjectValue',
                  fields: [
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'queueId' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'queueId' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'offset' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'offset' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'limit' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'limit' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'status' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'status' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'sortOrder' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'sortOrder' },
                      },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'Job' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'JobRepeatOptions' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'JobRepeatOptions' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'cron' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tz' } },
          { kind: 'Field', name: { kind: 'Name', value: 'startDate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'endDate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'limit' } },
          { kind: 'Field', name: { kind: 'Name', value: 'every' } },
          { kind: 'Field', name: { kind: 'Name', value: 'jobId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'count' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'JobOptions' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'JobOptions' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'timestamp' } },
          { kind: 'Field', name: { kind: 'Name', value: 'priority' } },
          { kind: 'Field', name: { kind: 'Name', value: 'delay' } },
          { kind: 'Field', name: { kind: 'Name', value: 'attempts' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'repeat' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'JobRepeatOptions' },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'backoff' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lifo' } },
          { kind: 'Field', name: { kind: 'Name', value: 'timeout' } },
          { kind: 'Field', name: { kind: 'Name', value: 'jobId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'removeOnComplete' } },
          { kind: 'Field', name: { kind: 'Name', value: 'removeOnFail' } },
          { kind: 'Field', name: { kind: 'Name', value: 'stackTraceLimit' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Job' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'Job' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'queueId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'timestamp' } },
          { kind: 'Field', name: { kind: 'Name', value: 'state' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'data' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'opts' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'JobOptions' },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'delay' } },
          { kind: 'Field', name: { kind: 'Name', value: 'progress' } },
          { kind: 'Field', name: { kind: 'Name', value: 'attemptsMade' } },
          { kind: 'Field', name: { kind: 'Name', value: 'processedOn' } },
          { kind: 'Field', name: { kind: 'Name', value: 'finishedOn' } },
          { kind: 'Field', name: { kind: 'Name', value: 'failedReason' } },
          { kind: 'Field', name: { kind: 'Name', value: 'stacktrace' } },
          { kind: 'Field', name: { kind: 'Name', value: 'returnvalue' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useGetJobsQuery__
 *
 * To run a query within a React component, call `useGetJobsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetJobsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetJobsQuery({
 *   variables: {
 *      queueId: // value for 'queueId'
 *      offset: // value for 'offset'
 *      limit: // value for 'limit'
 *      status: // value for 'status'
 *      sortOrder: // value for 'sortOrder'
 *   },
 * });
 */
export function useGetJobsQuery(
  baseOptions: Apollo.QueryHookOptions<GetJobsQuery, GetJobsQueryVariables>,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<GetJobsQuery, GetJobsQueryVariables>(
    GetJobsDocument,
    options,
  );
}
export function useGetJobsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetJobsQuery,
    GetJobsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<GetJobsQuery, GetJobsQueryVariables>(
    GetJobsDocument,
    options,
  );
}
export type GetJobsQueryHookResult = ReturnType<typeof useGetJobsQuery>;
export type GetJobsLazyQueryHookResult = ReturnType<typeof useGetJobsLazyQuery>;
export type GetJobsQueryResult = Apollo.QueryResult<
  GetJobsQuery,
  GetJobsQueryVariables
>;
export function refetchGetJobsQuery(variables: GetJobsQueryVariables) {
  return { query: GetJobsDocument, variables: variables };
}
export const GetRepeatableJobsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetRepeatableJobs' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'queueId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'offset' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
          defaultValue: { kind: 'IntValue', value: '0' },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'limit' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
          defaultValue: { kind: 'IntValue', value: '10' },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'sortOrder' },
          },
          type: {
            kind: 'NamedType',
            name: { kind: 'Name', value: 'SortOrderEnum' },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'queue' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'queueId' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'repeatableJobs' },
                  arguments: [
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'input' },
                      value: {
                        kind: 'ObjectValue',
                        fields: [
                          {
                            kind: 'ObjectField',
                            name: { kind: 'Name', value: 'offset' },
                            value: {
                              kind: 'Variable',
                              name: { kind: 'Name', value: 'offset' },
                            },
                          },
                          {
                            kind: 'ObjectField',
                            name: { kind: 'Name', value: 'limit' },
                            value: {
                              kind: 'Variable',
                              name: { kind: 'Name', value: 'limit' },
                            },
                          },
                          {
                            kind: 'ObjectField',
                            name: { kind: 'Name', value: 'order' },
                            value: {
                              kind: 'Variable',
                              name: { kind: 'Name', value: 'sortOrder' },
                            },
                          },
                        ],
                      },
                    },
                  ],
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'RepeatableJob' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'repeatableJobCount' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'RepeatableJob' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'RepeatableJob' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'key' } },
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'endDate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tz' } },
          { kind: 'Field', name: { kind: 'Name', value: 'cron' } },
          { kind: 'Field', name: { kind: 'Name', value: 'next' } },
          { kind: 'Field', name: { kind: 'Name', value: 'descr' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useGetRepeatableJobsQuery__
 *
 * To run a query within a React component, call `useGetRepeatableJobsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetRepeatableJobsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetRepeatableJobsQuery({
 *   variables: {
 *      queueId: // value for 'queueId'
 *      offset: // value for 'offset'
 *      limit: // value for 'limit'
 *      sortOrder: // value for 'sortOrder'
 *   },
 * });
 */
export function useGetRepeatableJobsQuery(
  baseOptions: Apollo.QueryHookOptions<
    GetRepeatableJobsQuery,
    GetRepeatableJobsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<
    GetRepeatableJobsQuery,
    GetRepeatableJobsQueryVariables
  >(GetRepeatableJobsDocument, options);
}
export function useGetRepeatableJobsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetRepeatableJobsQuery,
    GetRepeatableJobsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<
    GetRepeatableJobsQuery,
    GetRepeatableJobsQueryVariables
  >(GetRepeatableJobsDocument, options);
}
export type GetRepeatableJobsQueryHookResult = ReturnType<
  typeof useGetRepeatableJobsQuery
>;
export type GetRepeatableJobsLazyQueryHookResult = ReturnType<
  typeof useGetRepeatableJobsLazyQuery
>;
export type GetRepeatableJobsQueryResult = Apollo.QueryResult<
  GetRepeatableJobsQuery,
  GetRepeatableJobsQueryVariables
>;
export function refetchGetRepeatableJobsQuery(
  variables: GetRepeatableJobsQueryVariables,
) {
  return { query: GetRepeatableJobsDocument, variables: variables };
}
export const GetJobByIdDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetJobById' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'queueId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'job' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'queueId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'queueId' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'Job' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'JobRepeatOptions' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'JobRepeatOptions' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'cron' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tz' } },
          { kind: 'Field', name: { kind: 'Name', value: 'startDate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'endDate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'limit' } },
          { kind: 'Field', name: { kind: 'Name', value: 'every' } },
          { kind: 'Field', name: { kind: 'Name', value: 'jobId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'count' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'JobOptions' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'JobOptions' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'timestamp' } },
          { kind: 'Field', name: { kind: 'Name', value: 'priority' } },
          { kind: 'Field', name: { kind: 'Name', value: 'delay' } },
          { kind: 'Field', name: { kind: 'Name', value: 'attempts' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'repeat' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'JobRepeatOptions' },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'backoff' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lifo' } },
          { kind: 'Field', name: { kind: 'Name', value: 'timeout' } },
          { kind: 'Field', name: { kind: 'Name', value: 'jobId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'removeOnComplete' } },
          { kind: 'Field', name: { kind: 'Name', value: 'removeOnFail' } },
          { kind: 'Field', name: { kind: 'Name', value: 'stackTraceLimit' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Job' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'Job' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'queueId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'timestamp' } },
          { kind: 'Field', name: { kind: 'Name', value: 'state' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'data' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'opts' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'JobOptions' },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'delay' } },
          { kind: 'Field', name: { kind: 'Name', value: 'progress' } },
          { kind: 'Field', name: { kind: 'Name', value: 'attemptsMade' } },
          { kind: 'Field', name: { kind: 'Name', value: 'processedOn' } },
          { kind: 'Field', name: { kind: 'Name', value: 'finishedOn' } },
          { kind: 'Field', name: { kind: 'Name', value: 'failedReason' } },
          { kind: 'Field', name: { kind: 'Name', value: 'stacktrace' } },
          { kind: 'Field', name: { kind: 'Name', value: 'returnvalue' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useGetJobByIdQuery__
 *
 * To run a query within a React component, call `useGetJobByIdQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetJobByIdQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetJobByIdQuery({
 *   variables: {
 *      queueId: // value for 'queueId'
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetJobByIdQuery(
  baseOptions: Apollo.QueryHookOptions<
    GetJobByIdQuery,
    GetJobByIdQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<GetJobByIdQuery, GetJobByIdQueryVariables>(
    GetJobByIdDocument,
    options,
  );
}
export function useGetJobByIdLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetJobByIdQuery,
    GetJobByIdQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<GetJobByIdQuery, GetJobByIdQueryVariables>(
    GetJobByIdDocument,
    options,
  );
}
export type GetJobByIdQueryHookResult = ReturnType<typeof useGetJobByIdQuery>;
export type GetJobByIdLazyQueryHookResult = ReturnType<
  typeof useGetJobByIdLazyQuery
>;
export type GetJobByIdQueryResult = Apollo.QueryResult<
  GetJobByIdQuery,
  GetJobByIdQueryVariables
>;
export function refetchGetJobByIdQuery(variables: GetJobByIdQueryVariables) {
  return { query: GetJobByIdDocument, variables: variables };
}
export const GetJobLogsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetJobLogs' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'queueId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'start' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
          defaultValue: { kind: 'IntValue', value: '0' },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'end' } },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
          defaultValue: { kind: 'IntValue', value: '-1' },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'job' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'queueId' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'logs' },
                  arguments: [
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'start' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'start' },
                      },
                    },
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'end' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'end' },
                      },
                    },
                  ],
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'count' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'items' } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useGetJobLogsQuery__
 *
 * To run a query within a React component, call `useGetJobLogsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetJobLogsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetJobLogsQuery({
 *   variables: {
 *      queueId: // value for 'queueId'
 *      id: // value for 'id'
 *      start: // value for 'start'
 *      end: // value for 'end'
 *   },
 * });
 */
export function useGetJobLogsQuery(
  baseOptions: Apollo.QueryHookOptions<
    GetJobLogsQuery,
    GetJobLogsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<GetJobLogsQuery, GetJobLogsQueryVariables>(
    GetJobLogsDocument,
    options,
  );
}
export function useGetJobLogsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetJobLogsQuery,
    GetJobLogsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<GetJobLogsQuery, GetJobLogsQueryVariables>(
    GetJobLogsDocument,
    options,
  );
}
export type GetJobLogsQueryHookResult = ReturnType<typeof useGetJobLogsQuery>;
export type GetJobLogsLazyQueryHookResult = ReturnType<
  typeof useGetJobLogsLazyQuery
>;
export type GetJobLogsQueryResult = Apollo.QueryResult<
  GetJobLogsQuery,
  GetJobLogsQueryVariables
>;
export function refetchGetJobLogsQuery(variables: GetJobLogsQueryVariables) {
  return { query: GetJobLogsDocument, variables: variables };
}
export const CreateJobDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'CreateJob' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'jobName' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'data' } },
          type: {
            kind: 'NamedType',
            name: { kind: 'Name', value: 'JSONObject' },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'options' },
          },
          type: {
            kind: 'NamedType',
            name: { kind: 'Name', value: 'JobOptionsInput' },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'createJob' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'ObjectValue',
                  fields: [
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'queueId' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'id' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'jobName' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'jobName' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'data' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'data' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'options' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'options' },
                      },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'Job' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'JobRepeatOptions' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'JobRepeatOptions' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'cron' } },
          { kind: 'Field', name: { kind: 'Name', value: 'tz' } },
          { kind: 'Field', name: { kind: 'Name', value: 'startDate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'endDate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'limit' } },
          { kind: 'Field', name: { kind: 'Name', value: 'every' } },
          { kind: 'Field', name: { kind: 'Name', value: 'jobId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'count' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'JobOptions' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'JobOptions' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'timestamp' } },
          { kind: 'Field', name: { kind: 'Name', value: 'priority' } },
          { kind: 'Field', name: { kind: 'Name', value: 'delay' } },
          { kind: 'Field', name: { kind: 'Name', value: 'attempts' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'repeat' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'JobRepeatOptions' },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'backoff' } },
          { kind: 'Field', name: { kind: 'Name', value: 'lifo' } },
          { kind: 'Field', name: { kind: 'Name', value: 'timeout' } },
          { kind: 'Field', name: { kind: 'Name', value: 'jobId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'removeOnComplete' } },
          { kind: 'Field', name: { kind: 'Name', value: 'removeOnFail' } },
          { kind: 'Field', name: { kind: 'Name', value: 'stackTraceLimit' } },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Job' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'Job' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'queueId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'timestamp' } },
          { kind: 'Field', name: { kind: 'Name', value: 'state' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'data' } },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'opts' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'JobOptions' },
                },
              ],
            },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'delay' } },
          { kind: 'Field', name: { kind: 'Name', value: 'progress' } },
          { kind: 'Field', name: { kind: 'Name', value: 'attemptsMade' } },
          { kind: 'Field', name: { kind: 'Name', value: 'processedOn' } },
          { kind: 'Field', name: { kind: 'Name', value: 'finishedOn' } },
          { kind: 'Field', name: { kind: 'Name', value: 'failedReason' } },
          { kind: 'Field', name: { kind: 'Name', value: 'stacktrace' } },
          { kind: 'Field', name: { kind: 'Name', value: 'returnvalue' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode;
export type CreateJobMutationFn = Apollo.MutationFunction<
  CreateJobMutation,
  CreateJobMutationVariables
>;

/**
 * __useCreateJobMutation__
 *
 * To run a mutation, you first call `useCreateJobMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCreateJobMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [createJobMutation, { data, loading, error }] = useCreateJobMutation({
 *   variables: {
 *      id: // value for 'id'
 *      jobName: // value for 'jobName'
 *      data: // value for 'data'
 *      options: // value for 'options'
 *   },
 * });
 */
export function useCreateJobMutation(
  baseOptions?: Apollo.MutationHookOptions<
    CreateJobMutation,
    CreateJobMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<CreateJobMutation, CreateJobMutationVariables>(
    CreateJobDocument,
    options,
  );
}
export type CreateJobMutationHookResult = ReturnType<
  typeof useCreateJobMutation
>;
export type CreateJobMutationResult = Apollo.MutationResult<CreateJobMutation>;
export type CreateJobMutationOptions = Apollo.BaseMutationOptions<
  CreateJobMutation,
  CreateJobMutationVariables
>;
export const DeleteJobDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'DeleteJob' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'queueId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'jobId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'deleteJob' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'ObjectValue',
                  fields: [
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'queueId' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'queueId' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'jobId' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'jobId' },
                      },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'job' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;
export type DeleteJobMutationFn = Apollo.MutationFunction<
  DeleteJobMutation,
  DeleteJobMutationVariables
>;

/**
 * __useDeleteJobMutation__
 *
 * To run a mutation, you first call `useDeleteJobMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteJobMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteJobMutation, { data, loading, error }] = useDeleteJobMutation({
 *   variables: {
 *      queueId: // value for 'queueId'
 *      jobId: // value for 'jobId'
 *   },
 * });
 */
export function useDeleteJobMutation(
  baseOptions?: Apollo.MutationHookOptions<
    DeleteJobMutation,
    DeleteJobMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<DeleteJobMutation, DeleteJobMutationVariables>(
    DeleteJobDocument,
    options,
  );
}
export type DeleteJobMutationHookResult = ReturnType<
  typeof useDeleteJobMutation
>;
export type DeleteJobMutationResult = Apollo.MutationResult<DeleteJobMutation>;
export type DeleteJobMutationOptions = Apollo.BaseMutationOptions<
  DeleteJobMutation,
  DeleteJobMutationVariables
>;
export const DiscardJobDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'DiscardJob' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'queueId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'jobId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'discardJob' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'ObjectValue',
                  fields: [
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'queueId' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'queueId' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'jobId' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'jobId' },
                      },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'job' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'state' } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;
export type DiscardJobMutationFn = Apollo.MutationFunction<
  DiscardJobMutation,
  DiscardJobMutationVariables
>;

/**
 * __useDiscardJobMutation__
 *
 * To run a mutation, you first call `useDiscardJobMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDiscardJobMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [discardJobMutation, { data, loading, error }] = useDiscardJobMutation({
 *   variables: {
 *      queueId: // value for 'queueId'
 *      jobId: // value for 'jobId'
 *   },
 * });
 */
export function useDiscardJobMutation(
  baseOptions?: Apollo.MutationHookOptions<
    DiscardJobMutation,
    DiscardJobMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<DiscardJobMutation, DiscardJobMutationVariables>(
    DiscardJobDocument,
    options,
  );
}
export type DiscardJobMutationHookResult = ReturnType<
  typeof useDiscardJobMutation
>;
export type DiscardJobMutationResult =
  Apollo.MutationResult<DiscardJobMutation>;
export type DiscardJobMutationOptions = Apollo.BaseMutationOptions<
  DiscardJobMutation,
  DiscardJobMutationVariables
>;
export const MoveJobToCompletedDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'MoveJobToCompleted' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'queueId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'jobId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'moveJobToCompleted' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'ObjectValue',
                  fields: [
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'queueId' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'queueId' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'jobId' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'jobId' },
                      },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'job' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'state' } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;
export type MoveJobToCompletedMutationFn = Apollo.MutationFunction<
  MoveJobToCompletedMutation,
  MoveJobToCompletedMutationVariables
>;

/**
 * __useMoveJobToCompletedMutation__
 *
 * To run a mutation, you first call `useMoveJobToCompletedMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useMoveJobToCompletedMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [moveJobToCompletedMutation, { data, loading, error }] = useMoveJobToCompletedMutation({
 *   variables: {
 *      queueId: // value for 'queueId'
 *      jobId: // value for 'jobId'
 *   },
 * });
 */
export function useMoveJobToCompletedMutation(
  baseOptions?: Apollo.MutationHookOptions<
    MoveJobToCompletedMutation,
    MoveJobToCompletedMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    MoveJobToCompletedMutation,
    MoveJobToCompletedMutationVariables
  >(MoveJobToCompletedDocument, options);
}
export type MoveJobToCompletedMutationHookResult = ReturnType<
  typeof useMoveJobToCompletedMutation
>;
export type MoveJobToCompletedMutationResult =
  Apollo.MutationResult<MoveJobToCompletedMutation>;
export type MoveJobToCompletedMutationOptions = Apollo.BaseMutationOptions<
  MoveJobToCompletedMutation,
  MoveJobToCompletedMutationVariables
>;
export const MoveJobToFailedDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'MoveJobToFailed' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'queueId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'jobId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'moveJobToFailed' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'ObjectValue',
                  fields: [
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'queueId' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'queueId' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'jobId' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'jobId' },
                      },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'job' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'state' } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;
export type MoveJobToFailedMutationFn = Apollo.MutationFunction<
  MoveJobToFailedMutation,
  MoveJobToFailedMutationVariables
>;

/**
 * __useMoveJobToFailedMutation__
 *
 * To run a mutation, you first call `useMoveJobToFailedMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useMoveJobToFailedMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [moveJobToFailedMutation, { data, loading, error }] = useMoveJobToFailedMutation({
 *   variables: {
 *      queueId: // value for 'queueId'
 *      jobId: // value for 'jobId'
 *   },
 * });
 */
export function useMoveJobToFailedMutation(
  baseOptions?: Apollo.MutationHookOptions<
    MoveJobToFailedMutation,
    MoveJobToFailedMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    MoveJobToFailedMutation,
    MoveJobToFailedMutationVariables
  >(MoveJobToFailedDocument, options);
}
export type MoveJobToFailedMutationHookResult = ReturnType<
  typeof useMoveJobToFailedMutation
>;
export type MoveJobToFailedMutationResult =
  Apollo.MutationResult<MoveJobToFailedMutation>;
export type MoveJobToFailedMutationOptions = Apollo.BaseMutationOptions<
  MoveJobToFailedMutation,
  MoveJobToFailedMutationVariables
>;
export const DeleteRepeatableJobByKeyDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'DeleteRepeatableJobByKey' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'queueId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'key' } },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'deleteRepeatableJobByKey' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'ObjectValue',
                  fields: [
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'queueId' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'queueId' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'key' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'key' },
                      },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'key' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;
export type DeleteRepeatableJobByKeyMutationFn = Apollo.MutationFunction<
  DeleteRepeatableJobByKeyMutation,
  DeleteRepeatableJobByKeyMutationVariables
>;

/**
 * __useDeleteRepeatableJobByKeyMutation__
 *
 * To run a mutation, you first call `useDeleteRepeatableJobByKeyMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteRepeatableJobByKeyMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteRepeatableJobByKeyMutation, { data, loading, error }] = useDeleteRepeatableJobByKeyMutation({
 *   variables: {
 *      queueId: // value for 'queueId'
 *      key: // value for 'key'
 *   },
 * });
 */
export function useDeleteRepeatableJobByKeyMutation(
  baseOptions?: Apollo.MutationHookOptions<
    DeleteRepeatableJobByKeyMutation,
    DeleteRepeatableJobByKeyMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    DeleteRepeatableJobByKeyMutation,
    DeleteRepeatableJobByKeyMutationVariables
  >(DeleteRepeatableJobByKeyDocument, options);
}
export type DeleteRepeatableJobByKeyMutationHookResult = ReturnType<
  typeof useDeleteRepeatableJobByKeyMutation
>;
export type DeleteRepeatableJobByKeyMutationResult =
  Apollo.MutationResult<DeleteRepeatableJobByKeyMutation>;
export type DeleteRepeatableJobByKeyMutationOptions =
  Apollo.BaseMutationOptions<
    DeleteRepeatableJobByKeyMutation,
    DeleteRepeatableJobByKeyMutationVariables
  >;
export const DeleteBulkJobsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'DeleteBulkJobs' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'queueId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'jobIds' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'ListType',
              type: {
                kind: 'NonNullType',
                type: {
                  kind: 'NamedType',
                  name: { kind: 'Name', value: 'ID' },
                },
              },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'bulkDeleteJobs' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'ObjectValue',
                  fields: [
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'queueId' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'queueId' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'jobIds' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'jobIds' },
                      },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'status' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'success' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'reason' },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;
export type DeleteBulkJobsMutationFn = Apollo.MutationFunction<
  DeleteBulkJobsMutation,
  DeleteBulkJobsMutationVariables
>;

/**
 * __useDeleteBulkJobsMutation__
 *
 * To run a mutation, you first call `useDeleteBulkJobsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteBulkJobsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteBulkJobsMutation, { data, loading, error }] = useDeleteBulkJobsMutation({
 *   variables: {
 *      queueId: // value for 'queueId'
 *      jobIds: // value for 'jobIds'
 *   },
 * });
 */
export function useDeleteBulkJobsMutation(
  baseOptions?: Apollo.MutationHookOptions<
    DeleteBulkJobsMutation,
    DeleteBulkJobsMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    DeleteBulkJobsMutation,
    DeleteBulkJobsMutationVariables
  >(DeleteBulkJobsDocument, options);
}
export type DeleteBulkJobsMutationHookResult = ReturnType<
  typeof useDeleteBulkJobsMutation
>;
export type DeleteBulkJobsMutationResult =
  Apollo.MutationResult<DeleteBulkJobsMutation>;
export type DeleteBulkJobsMutationOptions = Apollo.BaseMutationOptions<
  DeleteBulkJobsMutation,
  DeleteBulkJobsMutationVariables
>;
export const RetryJobDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'RetryJob' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'queueId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'jobId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'retryJob' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'ObjectValue',
                  fields: [
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'queueId' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'queueId' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'jobId' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'jobId' },
                      },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'job' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'state' } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;
export type RetryJobMutationFn = Apollo.MutationFunction<
  RetryJobMutation,
  RetryJobMutationVariables
>;

/**
 * __useRetryJobMutation__
 *
 * To run a mutation, you first call `useRetryJobMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRetryJobMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [retryJobMutation, { data, loading, error }] = useRetryJobMutation({
 *   variables: {
 *      queueId: // value for 'queueId'
 *      jobId: // value for 'jobId'
 *   },
 * });
 */
export function useRetryJobMutation(
  baseOptions?: Apollo.MutationHookOptions<
    RetryJobMutation,
    RetryJobMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<RetryJobMutation, RetryJobMutationVariables>(
    RetryJobDocument,
    options,
  );
}
export type RetryJobMutationHookResult = ReturnType<typeof useRetryJobMutation>;
export type RetryJobMutationResult = Apollo.MutationResult<RetryJobMutation>;
export type RetryJobMutationOptions = Apollo.BaseMutationOptions<
  RetryJobMutation,
  RetryJobMutationVariables
>;
export const RetryBulkJobsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'RetryBulkJobs' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'queueId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'jobIds' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'ListType',
              type: {
                kind: 'NonNullType',
                type: {
                  kind: 'NamedType',
                  name: { kind: 'Name', value: 'ID' },
                },
              },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'bulkRetryJobs' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'ObjectValue',
                  fields: [
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'queueId' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'queueId' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'jobIds' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'jobIds' },
                      },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'status' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'success' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'reason' },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;
export type RetryBulkJobsMutationFn = Apollo.MutationFunction<
  RetryBulkJobsMutation,
  RetryBulkJobsMutationVariables
>;

/**
 * __useRetryBulkJobsMutation__
 *
 * To run a mutation, you first call `useRetryBulkJobsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useRetryBulkJobsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [retryBulkJobsMutation, { data, loading, error }] = useRetryBulkJobsMutation({
 *   variables: {
 *      queueId: // value for 'queueId'
 *      jobIds: // value for 'jobIds'
 *   },
 * });
 */
export function useRetryBulkJobsMutation(
  baseOptions?: Apollo.MutationHookOptions<
    RetryBulkJobsMutation,
    RetryBulkJobsMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    RetryBulkJobsMutation,
    RetryBulkJobsMutationVariables
  >(RetryBulkJobsDocument, options);
}
export type RetryBulkJobsMutationHookResult = ReturnType<
  typeof useRetryBulkJobsMutation
>;
export type RetryBulkJobsMutationResult =
  Apollo.MutationResult<RetryBulkJobsMutation>;
export type RetryBulkJobsMutationOptions = Apollo.BaseMutationOptions<
  RetryBulkJobsMutation,
  RetryBulkJobsMutationVariables
>;
export const PromoteJobDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'PromoteJob' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'queueId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'jobId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'promoteJob' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'ObjectValue',
                  fields: [
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'queueId' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'queueId' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'jobId' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'jobId' },
                      },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'job' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'state' } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;
export type PromoteJobMutationFn = Apollo.MutationFunction<
  PromoteJobMutation,
  PromoteJobMutationVariables
>;

/**
 * __usePromoteJobMutation__
 *
 * To run a mutation, you first call `usePromoteJobMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePromoteJobMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [promoteJobMutation, { data, loading, error }] = usePromoteJobMutation({
 *   variables: {
 *      queueId: // value for 'queueId'
 *      jobId: // value for 'jobId'
 *   },
 * });
 */
export function usePromoteJobMutation(
  baseOptions?: Apollo.MutationHookOptions<
    PromoteJobMutation,
    PromoteJobMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<PromoteJobMutation, PromoteJobMutationVariables>(
    PromoteJobDocument,
    options,
  );
}
export type PromoteJobMutationHookResult = ReturnType<
  typeof usePromoteJobMutation
>;
export type PromoteJobMutationResult =
  Apollo.MutationResult<PromoteJobMutation>;
export type PromoteJobMutationOptions = Apollo.BaseMutationOptions<
  PromoteJobMutation,
  PromoteJobMutationVariables
>;
export const PromoteBulkJobsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'PromoteBulkJobs' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'queueId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'jobIds' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'ListType',
              type: {
                kind: 'NonNullType',
                type: {
                  kind: 'NamedType',
                  name: { kind: 'Name', value: 'ID' },
                },
              },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'bulkPromoteJobs' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'ObjectValue',
                  fields: [
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'queueId' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'queueId' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'jobIds' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'jobIds' },
                      },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'status' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'success' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'reason' },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;
export type PromoteBulkJobsMutationFn = Apollo.MutationFunction<
  PromoteBulkJobsMutation,
  PromoteBulkJobsMutationVariables
>;

/**
 * __usePromoteBulkJobsMutation__
 *
 * To run a mutation, you first call `usePromoteBulkJobsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePromoteBulkJobsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [promoteBulkJobsMutation, { data, loading, error }] = usePromoteBulkJobsMutation({
 *   variables: {
 *      queueId: // value for 'queueId'
 *      jobIds: // value for 'jobIds'
 *   },
 * });
 */
export function usePromoteBulkJobsMutation(
  baseOptions?: Apollo.MutationHookOptions<
    PromoteBulkJobsMutation,
    PromoteBulkJobsMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    PromoteBulkJobsMutation,
    PromoteBulkJobsMutationVariables
  >(PromoteBulkJobsDocument, options);
}
export type PromoteBulkJobsMutationHookResult = ReturnType<
  typeof usePromoteBulkJobsMutation
>;
export type PromoteBulkJobsMutationResult =
  Apollo.MutationResult<PromoteBulkJobsMutation>;
export type PromoteBulkJobsMutationOptions = Apollo.BaseMutationOptions<
  PromoteBulkJobsMutation,
  PromoteBulkJobsMutationVariables
>;
export const DeleteJobsByFilterDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'DeleteJobsByFilter' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'queueId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'status' },
          },
          type: {
            kind: 'NamedType',
            name: { kind: 'Name', value: 'JobSearchStatus' },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'filter' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'pattern' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'deleteJobsByFilter' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'ObjectValue',
                  fields: [
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'queueId' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'queueId' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'status' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'status' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'expression' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'filter' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'pattern' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'pattern' },
                      },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'removed' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;
export type DeleteJobsByFilterMutationFn = Apollo.MutationFunction<
  DeleteJobsByFilterMutation,
  DeleteJobsByFilterMutationVariables
>;

/**
 * __useDeleteJobsByFilterMutation__
 *
 * To run a mutation, you first call `useDeleteJobsByFilterMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteJobsByFilterMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteJobsByFilterMutation, { data, loading, error }] = useDeleteJobsByFilterMutation({
 *   variables: {
 *      queueId: // value for 'queueId'
 *      status: // value for 'status'
 *      filter: // value for 'filter'
 *      pattern: // value for 'pattern'
 *   },
 * });
 */
export function useDeleteJobsByFilterMutation(
  baseOptions?: Apollo.MutationHookOptions<
    DeleteJobsByFilterMutation,
    DeleteJobsByFilterMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    DeleteJobsByFilterMutation,
    DeleteJobsByFilterMutationVariables
  >(DeleteJobsByFilterDocument, options);
}
export type DeleteJobsByFilterMutationHookResult = ReturnType<
  typeof useDeleteJobsByFilterMutation
>;
export type DeleteJobsByFilterMutationResult =
  Apollo.MutationResult<DeleteJobsByFilterMutation>;
export type DeleteJobsByFilterMutationOptions = Apollo.BaseMutationOptions<
  DeleteJobsByFilterMutation,
  DeleteJobsByFilterMutationVariables
>;
export const DeleteJobsByPatternDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'DeleteJobsByPattern' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'queueId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'status' },
          },
          type: {
            kind: 'NamedType',
            name: { kind: 'Name', value: 'JobSearchStatus' },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'pattern' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'String' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'deleteJobsByPattern' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'ObjectValue',
                  fields: [
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'queueId' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'queueId' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'status' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'status' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'pattern' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'pattern' },
                      },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'removed' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;
export type DeleteJobsByPatternMutationFn = Apollo.MutationFunction<
  DeleteJobsByPatternMutation,
  DeleteJobsByPatternMutationVariables
>;

/**
 * __useDeleteJobsByPatternMutation__
 *
 * To run a mutation, you first call `useDeleteJobsByPatternMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteJobsByPatternMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteJobsByPatternMutation, { data, loading, error }] = useDeleteJobsByPatternMutation({
 *   variables: {
 *      queueId: // value for 'queueId'
 *      status: // value for 'status'
 *      pattern: // value for 'pattern'
 *   },
 * });
 */
export function useDeleteJobsByPatternMutation(
  baseOptions?: Apollo.MutationHookOptions<
    DeleteJobsByPatternMutation,
    DeleteJobsByPatternMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    DeleteJobsByPatternMutation,
    DeleteJobsByPatternMutationVariables
  >(DeleteJobsByPatternDocument, options);
}
export type DeleteJobsByPatternMutationHookResult = ReturnType<
  typeof useDeleteJobsByPatternMutation
>;
export type DeleteJobsByPatternMutationResult =
  Apollo.MutationResult<DeleteJobsByPatternMutation>;
export type DeleteJobsByPatternMutationOptions = Apollo.BaseMutationOptions<
  DeleteJobsByPatternMutation,
  DeleteJobsByPatternMutationVariables
>;
export const GetQueueByIdDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetQueueById' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'queue' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'Queue' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'JobCounts' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'Queue' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'jobCounts' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'active' } },
                { kind: 'Field', name: { kind: 'Name', value: 'failed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'paused' } },
                { kind: 'Field', name: { kind: 'Name', value: 'completed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'delayed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'waiting' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Queue' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'Queue' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'host' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hostId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'prefix' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isPaused' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isReadonly' } },
          {
            kind: 'FragmentSpread',
            name: { kind: 'Name', value: 'JobCounts' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'repeatableJobCount' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'workerCount' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useGetQueueByIdQuery__
 *
 * To run a query within a React component, call `useGetQueueByIdQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetQueueByIdQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetQueueByIdQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetQueueByIdQuery(
  baseOptions: Apollo.QueryHookOptions<
    GetQueueByIdQuery,
    GetQueueByIdQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<GetQueueByIdQuery, GetQueueByIdQueryVariables>(
    GetQueueByIdDocument,
    options,
  );
}
export function useGetQueueByIdLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetQueueByIdQuery,
    GetQueueByIdQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<GetQueueByIdQuery, GetQueueByIdQueryVariables>(
    GetQueueByIdDocument,
    options,
  );
}
export type GetQueueByIdQueryHookResult = ReturnType<
  typeof useGetQueueByIdQuery
>;
export type GetQueueByIdLazyQueryHookResult = ReturnType<
  typeof useGetQueueByIdLazyQuery
>;
export type GetQueueByIdQueryResult = Apollo.QueryResult<
  GetQueueByIdQuery,
  GetQueueByIdQueryVariables
>;
export function refetchGetQueueByIdQuery(
  variables: GetQueueByIdQueryVariables,
) {
  return { query: GetQueueByIdDocument, variables: variables };
}
export const PauseQueueDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'PauseQueue' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'pauseQueue' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'isPaused' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;
export type PauseQueueMutationFn = Apollo.MutationFunction<
  PauseQueueMutation,
  PauseQueueMutationVariables
>;

/**
 * __usePauseQueueMutation__
 *
 * To run a mutation, you first call `usePauseQueueMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePauseQueueMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [pauseQueueMutation, { data, loading, error }] = usePauseQueueMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function usePauseQueueMutation(
  baseOptions?: Apollo.MutationHookOptions<
    PauseQueueMutation,
    PauseQueueMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<PauseQueueMutation, PauseQueueMutationVariables>(
    PauseQueueDocument,
    options,
  );
}
export type PauseQueueMutationHookResult = ReturnType<
  typeof usePauseQueueMutation
>;
export type PauseQueueMutationResult =
  Apollo.MutationResult<PauseQueueMutation>;
export type PauseQueueMutationOptions = Apollo.BaseMutationOptions<
  PauseQueueMutation,
  PauseQueueMutationVariables
>;
export const ResumeQueueDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'ResumeQueue' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'resumeQueue' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'isPaused' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;
export type ResumeQueueMutationFn = Apollo.MutationFunction<
  ResumeQueueMutation,
  ResumeQueueMutationVariables
>;

/**
 * __useResumeQueueMutation__
 *
 * To run a mutation, you first call `useResumeQueueMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useResumeQueueMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [resumeQueueMutation, { data, loading, error }] = useResumeQueueMutation({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useResumeQueueMutation(
  baseOptions?: Apollo.MutationHookOptions<
    ResumeQueueMutation,
    ResumeQueueMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<ResumeQueueMutation, ResumeQueueMutationVariables>(
    ResumeQueueDocument,
    options,
  );
}
export type ResumeQueueMutationHookResult = ReturnType<
  typeof useResumeQueueMutation
>;
export type ResumeQueueMutationResult =
  Apollo.MutationResult<ResumeQueueMutation>;
export type ResumeQueueMutationOptions = Apollo.BaseMutationOptions<
  ResumeQueueMutation,
  ResumeQueueMutationVariables
>;
export const DeleteQueueDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'DeleteQueue' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'checkActivity' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Boolean' } },
          defaultValue: { kind: 'BooleanValue', value: false },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'deleteQueue' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'options' },
                value: {
                  kind: 'ObjectValue',
                  fields: [
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'checkActivity' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'checkActivity' },
                      },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'queueId' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'deletedJobCount' },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;
export type DeleteQueueMutationFn = Apollo.MutationFunction<
  DeleteQueueMutation,
  DeleteQueueMutationVariables
>;

/**
 * __useDeleteQueueMutation__
 *
 * To run a mutation, you first call `useDeleteQueueMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteQueueMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteQueueMutation, { data, loading, error }] = useDeleteQueueMutation({
 *   variables: {
 *      id: // value for 'id'
 *      checkActivity: // value for 'checkActivity'
 *   },
 * });
 */
export function useDeleteQueueMutation(
  baseOptions?: Apollo.MutationHookOptions<
    DeleteQueueMutation,
    DeleteQueueMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<DeleteQueueMutation, DeleteQueueMutationVariables>(
    DeleteQueueDocument,
    options,
  );
}
export type DeleteQueueMutationHookResult = ReturnType<
  typeof useDeleteQueueMutation
>;
export type DeleteQueueMutationResult =
  Apollo.MutationResult<DeleteQueueMutation>;
export type DeleteQueueMutationOptions = Apollo.BaseMutationOptions<
  DeleteQueueMutation,
  DeleteQueueMutationVariables
>;
export const CleanQueueDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'CleanQueue' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'grace' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'Duration' },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'limit' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Int' } },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'status' },
          },
          type: {
            kind: 'NamedType',
            name: { kind: 'Name', value: 'CleanQueueJobType' },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'cleanQueue' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'ObjectValue',
                  fields: [
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'id' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'id' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'grace' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'grace' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'limit' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'limit' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'status' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'status' },
                      },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'count' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;
export type CleanQueueMutationFn = Apollo.MutationFunction<
  CleanQueueMutation,
  CleanQueueMutationVariables
>;

/**
 * __useCleanQueueMutation__
 *
 * To run a mutation, you first call `useCleanQueueMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useCleanQueueMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [cleanQueueMutation, { data, loading, error }] = useCleanQueueMutation({
 *   variables: {
 *      id: // value for 'id'
 *      grace: // value for 'grace'
 *      limit: // value for 'limit'
 *      status: // value for 'status'
 *   },
 * });
 */
export function useCleanQueueMutation(
  baseOptions?: Apollo.MutationHookOptions<
    CleanQueueMutation,
    CleanQueueMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<CleanQueueMutation, CleanQueueMutationVariables>(
    CleanQueueDocument,
    options,
  );
}
export type CleanQueueMutationHookResult = ReturnType<
  typeof useCleanQueueMutation
>;
export type CleanQueueMutationResult =
  Apollo.MutationResult<CleanQueueMutation>;
export type CleanQueueMutationOptions = Apollo.BaseMutationOptions<
  CleanQueueMutation,
  CleanQueueMutationVariables
>;
export const DrainQueueDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'DrainQueue' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'delayed' },
          },
          type: { kind: 'NamedType', name: { kind: 'Name', value: 'Boolean' } },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'drainQueue' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'delayed' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'delayed' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'queue' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'Queue' },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'JobCounts' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'Queue' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'jobCounts' },
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'active' } },
                { kind: 'Field', name: { kind: 'Name', value: 'failed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'paused' } },
                { kind: 'Field', name: { kind: 'Name', value: 'completed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'delayed' } },
                { kind: 'Field', name: { kind: 'Name', value: 'waiting' } },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'Queue' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'Queue' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'id' } },
          { kind: 'Field', name: { kind: 'Name', value: 'name' } },
          { kind: 'Field', name: { kind: 'Name', value: 'host' } },
          { kind: 'Field', name: { kind: 'Name', value: 'hostId' } },
          { kind: 'Field', name: { kind: 'Name', value: 'prefix' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isPaused' } },
          { kind: 'Field', name: { kind: 'Name', value: 'isReadonly' } },
          {
            kind: 'FragmentSpread',
            name: { kind: 'Name', value: 'JobCounts' },
          },
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'repeatableJobCount' },
          },
          { kind: 'Field', name: { kind: 'Name', value: 'workerCount' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode;
export type DrainQueueMutationFn = Apollo.MutationFunction<
  DrainQueueMutation,
  DrainQueueMutationVariables
>;

/**
 * __useDrainQueueMutation__
 *
 * To run a mutation, you first call `useDrainQueueMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDrainQueueMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [drainQueueMutation, { data, loading, error }] = useDrainQueueMutation({
 *   variables: {
 *      id: // value for 'id'
 *      delayed: // value for 'delayed'
 *   },
 * });
 */
export function useDrainQueueMutation(
  baseOptions?: Apollo.MutationHookOptions<
    DrainQueueMutation,
    DrainQueueMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<DrainQueueMutation, DrainQueueMutationVariables>(
    DrainQueueDocument,
    options,
  );
}
export type DrainQueueMutationHookResult = ReturnType<
  typeof useDrainQueueMutation
>;
export type DrainQueueMutationResult =
  Apollo.MutationResult<DrainQueueMutation>;
export type DrainQueueMutationOptions = Apollo.BaseMutationOptions<
  DrainQueueMutation,
  DrainQueueMutationVariables
>;
export const GetQueueWorkersDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetQueueWorkers' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'queue' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'workers' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'addr' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'age' } },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'started' },
                      },
                      { kind: 'Field', name: { kind: 'Name', value: 'idle' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'role' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'db' } },
                      { kind: 'Field', name: { kind: 'Name', value: 'omem' } },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useGetQueueWorkersQuery__
 *
 * To run a query within a React component, call `useGetQueueWorkersQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetQueueWorkersQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetQueueWorkersQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetQueueWorkersQuery(
  baseOptions: Apollo.QueryHookOptions<
    GetQueueWorkersQuery,
    GetQueueWorkersQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<GetQueueWorkersQuery, GetQueueWorkersQueryVariables>(
    GetQueueWorkersDocument,
    options,
  );
}
export function useGetQueueWorkersLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetQueueWorkersQuery,
    GetQueueWorkersQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<
    GetQueueWorkersQuery,
    GetQueueWorkersQueryVariables
  >(GetQueueWorkersDocument, options);
}
export type GetQueueWorkersQueryHookResult = ReturnType<
  typeof useGetQueueWorkersQuery
>;
export type GetQueueWorkersLazyQueryHookResult = ReturnType<
  typeof useGetQueueWorkersLazyQuery
>;
export type GetQueueWorkersQueryResult = Apollo.QueryResult<
  GetQueueWorkersQuery,
  GetQueueWorkersQueryVariables
>;
export function refetchGetQueueWorkersQuery(
  variables: GetQueueWorkersQueryVariables,
) {
  return { query: GetQueueWorkersDocument, variables: variables };
}
export const GetJobSchemasDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetJobSchemas' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'queue' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'jobSchemas' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'jobName' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'schema' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'defaultOpts' },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useGetJobSchemasQuery__
 *
 * To run a query within a React component, call `useGetJobSchemasQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetJobSchemasQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetJobSchemasQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetJobSchemasQuery(
  baseOptions: Apollo.QueryHookOptions<
    GetJobSchemasQuery,
    GetJobSchemasQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<GetJobSchemasQuery, GetJobSchemasQueryVariables>(
    GetJobSchemasDocument,
    options,
  );
}
export function useGetJobSchemasLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetJobSchemasQuery,
    GetJobSchemasQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<GetJobSchemasQuery, GetJobSchemasQueryVariables>(
    GetJobSchemasDocument,
    options,
  );
}
export type GetJobSchemasQueryHookResult = ReturnType<
  typeof useGetJobSchemasQuery
>;
export type GetJobSchemasLazyQueryHookResult = ReturnType<
  typeof useGetJobSchemasLazyQuery
>;
export type GetJobSchemasQueryResult = Apollo.QueryResult<
  GetJobSchemasQuery,
  GetJobSchemasQueryVariables
>;
export function refetchGetJobSchemasQuery(
  variables: GetJobSchemasQueryVariables,
) {
  return { query: GetJobSchemasDocument, variables: variables };
}
export const GetJobSchemaDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetJobSchema' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'jobName' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'queueJobSchema' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'ObjectValue',
                  fields: [
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'queueId' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'id' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'jobName' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'jobName' },
                      },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'jobName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'schema' } },
                { kind: 'Field', name: { kind: 'Name', value: 'defaultOpts' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useGetJobSchemaQuery__
 *
 * To run a query within a React component, call `useGetJobSchemaQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetJobSchemaQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetJobSchemaQuery({
 *   variables: {
 *      id: // value for 'id'
 *      jobName: // value for 'jobName'
 *   },
 * });
 */
export function useGetJobSchemaQuery(
  baseOptions: Apollo.QueryHookOptions<
    GetJobSchemaQuery,
    GetJobSchemaQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<GetJobSchemaQuery, GetJobSchemaQueryVariables>(
    GetJobSchemaDocument,
    options,
  );
}
export function useGetJobSchemaLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetJobSchemaQuery,
    GetJobSchemaQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<GetJobSchemaQuery, GetJobSchemaQueryVariables>(
    GetJobSchemaDocument,
    options,
  );
}
export type GetJobSchemaQueryHookResult = ReturnType<
  typeof useGetJobSchemaQuery
>;
export type GetJobSchemaLazyQueryHookResult = ReturnType<
  typeof useGetJobSchemaLazyQuery
>;
export type GetJobSchemaQueryResult = Apollo.QueryResult<
  GetJobSchemaQuery,
  GetJobSchemaQueryVariables
>;
export function refetchGetJobSchemaQuery(
  variables: GetJobSchemaQueryVariables,
) {
  return { query: GetJobSchemaDocument, variables: variables };
}
export const SetJobSchemaDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'SetJobSchema' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'jobName' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'schema' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'JSONSchema' },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'defaultOpts' },
          },
          type: {
            kind: 'NamedType',
            name: { kind: 'Name', value: 'JobOptionsInput' },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'setJobSchema' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'ObjectValue',
                  fields: [
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'queueId' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'id' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'jobName' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'jobName' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'schema' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'schema' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'defaultOpts' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'defaultOpts' },
                      },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'jobName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'schema' } },
                { kind: 'Field', name: { kind: 'Name', value: 'defaultOpts' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;
export type SetJobSchemaMutationFn = Apollo.MutationFunction<
  SetJobSchemaMutation,
  SetJobSchemaMutationVariables
>;

/**
 * __useSetJobSchemaMutation__
 *
 * To run a mutation, you first call `useSetJobSchemaMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSetJobSchemaMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [setJobSchemaMutation, { data, loading, error }] = useSetJobSchemaMutation({
 *   variables: {
 *      id: // value for 'id'
 *      jobName: // value for 'jobName'
 *      schema: // value for 'schema'
 *      defaultOpts: // value for 'defaultOpts'
 *   },
 * });
 */
export function useSetJobSchemaMutation(
  baseOptions?: Apollo.MutationHookOptions<
    SetJobSchemaMutation,
    SetJobSchemaMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    SetJobSchemaMutation,
    SetJobSchemaMutationVariables
  >(SetJobSchemaDocument, options);
}
export type SetJobSchemaMutationHookResult = ReturnType<
  typeof useSetJobSchemaMutation
>;
export type SetJobSchemaMutationResult =
  Apollo.MutationResult<SetJobSchemaMutation>;
export type SetJobSchemaMutationOptions = Apollo.BaseMutationOptions<
  SetJobSchemaMutation,
  SetJobSchemaMutationVariables
>;
export const DeleteJobSchemaDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'mutation',
      name: { kind: 'Name', value: 'DeleteJobSchema' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'jobName' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'deleteJobSchema' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'ObjectValue',
                  fields: [
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'queueId' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'id' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'jobName' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'jobName' },
                      },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'jobName' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;
export type DeleteJobSchemaMutationFn = Apollo.MutationFunction<
  DeleteJobSchemaMutation,
  DeleteJobSchemaMutationVariables
>;

/**
 * __useDeleteJobSchemaMutation__
 *
 * To run a mutation, you first call `useDeleteJobSchemaMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useDeleteJobSchemaMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [deleteJobSchemaMutation, { data, loading, error }] = useDeleteJobSchemaMutation({
 *   variables: {
 *      id: // value for 'id'
 *      jobName: // value for 'jobName'
 *   },
 * });
 */
export function useDeleteJobSchemaMutation(
  baseOptions?: Apollo.MutationHookOptions<
    DeleteJobSchemaMutation,
    DeleteJobSchemaMutationVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useMutation<
    DeleteJobSchemaMutation,
    DeleteJobSchemaMutationVariables
  >(DeleteJobSchemaDocument, options);
}
export type DeleteJobSchemaMutationHookResult = ReturnType<
  typeof useDeleteJobSchemaMutation
>;
export type DeleteJobSchemaMutationResult =
  Apollo.MutationResult<DeleteJobSchemaMutation>;
export type DeleteJobSchemaMutationOptions = Apollo.BaseMutationOptions<
  DeleteJobSchemaMutation,
  DeleteJobSchemaMutationVariables
>;
export const InferJobSchemaDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'InferJobSchema' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'queueId' },
          },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'jobName' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'inferJobSchema' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'ObjectValue',
                  fields: [
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'queueId' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'queueId' },
                      },
                    },
                    {
                      kind: 'ObjectField',
                      name: { kind: 'Name', value: 'jobName' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'jobName' },
                      },
                    },
                  ],
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'jobName' } },
                { kind: 'Field', name: { kind: 'Name', value: 'schema' } },
                { kind: 'Field', name: { kind: 'Name', value: 'defaultOpts' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useInferJobSchemaQuery__
 *
 * To run a query within a React component, call `useInferJobSchemaQuery` and pass it any options that fit your needs.
 * When your component renders, `useInferJobSchemaQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useInferJobSchemaQuery({
 *   variables: {
 *      queueId: // value for 'queueId'
 *      jobName: // value for 'jobName'
 *   },
 * });
 */
export function useInferJobSchemaQuery(
  baseOptions: Apollo.QueryHookOptions<
    InferJobSchemaQuery,
    InferJobSchemaQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<InferJobSchemaQuery, InferJobSchemaQueryVariables>(
    InferJobSchemaDocument,
    options,
  );
}
export function useInferJobSchemaLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    InferJobSchemaQuery,
    InferJobSchemaQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<InferJobSchemaQuery, InferJobSchemaQueryVariables>(
    InferJobSchemaDocument,
    options,
  );
}
export type InferJobSchemaQueryHookResult = ReturnType<
  typeof useInferJobSchemaQuery
>;
export type InferJobSchemaLazyQueryHookResult = ReturnType<
  typeof useInferJobSchemaLazyQuery
>;
export type InferJobSchemaQueryResult = Apollo.QueryResult<
  InferJobSchemaQuery,
  InferJobSchemaQueryVariables
>;
export function refetchInferJobSchemaQuery(
  variables: InferJobSchemaQueryVariables,
) {
  return { query: InferJobSchemaDocument, variables: variables };
}
export const GetJobOptionsSchemaDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetJobOptionsSchema' },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'jobOptionsSchema' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useGetJobOptionsSchemaQuery__
 *
 * To run a query within a React component, call `useGetJobOptionsSchemaQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetJobOptionsSchemaQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetJobOptionsSchemaQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetJobOptionsSchemaQuery(
  baseOptions?: Apollo.QueryHookOptions<
    GetJobOptionsSchemaQuery,
    GetJobOptionsSchemaQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<
    GetJobOptionsSchemaQuery,
    GetJobOptionsSchemaQueryVariables
  >(GetJobOptionsSchemaDocument, options);
}
export function useGetJobOptionsSchemaLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetJobOptionsSchemaQuery,
    GetJobOptionsSchemaQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<
    GetJobOptionsSchemaQuery,
    GetJobOptionsSchemaQueryVariables
  >(GetJobOptionsSchemaDocument, options);
}
export type GetJobOptionsSchemaQueryHookResult = ReturnType<
  typeof useGetJobOptionsSchemaQuery
>;
export type GetJobOptionsSchemaLazyQueryHookResult = ReturnType<
  typeof useGetJobOptionsSchemaLazyQuery
>;
export type GetJobOptionsSchemaQueryResult = Apollo.QueryResult<
  GetJobOptionsSchemaQuery,
  GetJobOptionsSchemaQueryVariables
>;
export function refetchGetJobOptionsSchemaQuery(
  variables?: GetJobOptionsSchemaQueryVariables,
) {
  return { query: GetJobOptionsSchemaDocument, variables: variables };
}
export const GetQueueJobsNamesDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetQueueJobsNames' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'queue' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'jobNames' } },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useGetQueueJobsNamesQuery__
 *
 * To run a query within a React component, call `useGetQueueJobsNamesQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetQueueJobsNamesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetQueueJobsNamesQuery({
 *   variables: {
 *      id: // value for 'id'
 *   },
 * });
 */
export function useGetQueueJobsNamesQuery(
  baseOptions: Apollo.QueryHookOptions<
    GetQueueJobsNamesQuery,
    GetQueueJobsNamesQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<
    GetQueueJobsNamesQuery,
    GetQueueJobsNamesQueryVariables
  >(GetQueueJobsNamesDocument, options);
}
export function useGetQueueJobsNamesLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetQueueJobsNamesQuery,
    GetQueueJobsNamesQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<
    GetQueueJobsNamesQuery,
    GetQueueJobsNamesQueryVariables
  >(GetQueueJobsNamesDocument, options);
}
export type GetQueueJobsNamesQueryHookResult = ReturnType<
  typeof useGetQueueJobsNamesQuery
>;
export type GetQueueJobsNamesLazyQueryHookResult = ReturnType<
  typeof useGetQueueJobsNamesLazyQuery
>;
export type GetQueueJobsNamesQueryResult = Apollo.QueryResult<
  GetQueueJobsNamesQuery,
  GetQueueJobsNamesQueryVariables
>;
export function refetchGetQueueJobsNamesQuery(
  variables: GetQueueJobsNamesQueryVariables,
) {
  return { query: GetQueueJobsNamesDocument, variables: variables };
}
export const GetPageQueueStatsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetPageQueueStats' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'range' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'String' },
            },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'granularity' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'StatsGranularity' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'queue' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                { kind: 'Field', name: { kind: 'Name', value: 'id' } },
                { kind: 'Field', name: { kind: 'Name', value: 'name' } },
                { kind: 'Field', name: { kind: 'Name', value: 'hostId' } },
                { kind: 'Field', name: { kind: 'Name', value: 'prefix' } },
                { kind: 'Field', name: { kind: 'Name', value: 'isPaused' } },
                { kind: 'Field', name: { kind: 'Name', value: 'jobNames' } },
                { kind: 'Field', name: { kind: 'Name', value: 'workerCount' } },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'throughput' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'm1Rate' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'm5Rate' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'm15Rate' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'errorRate' },
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'm1Rate' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'm5Rate' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'm15Rate' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'stats' },
                  arguments: [
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'input' },
                      value: {
                        kind: 'ObjectValue',
                        fields: [
                          {
                            kind: 'ObjectField',
                            name: { kind: 'Name', value: 'range' },
                            value: {
                              kind: 'Variable',
                              name: { kind: 'Name', value: 'range' },
                            },
                          },
                          {
                            kind: 'ObjectField',
                            name: { kind: 'Name', value: 'granularity' },
                            value: {
                              kind: 'Variable',
                              name: { kind: 'Name', value: 'granularity' },
                            },
                          },
                        ],
                      },
                    },
                  ],
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'StatsSnapshot' },
                      },
                    ],
                  },
                },
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'statsAggregate' },
                  arguments: [
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'input' },
                      value: {
                        kind: 'ObjectValue',
                        fields: [
                          {
                            kind: 'ObjectField',
                            name: { kind: 'Name', value: 'range' },
                            value: {
                              kind: 'Variable',
                              name: { kind: 'Name', value: 'range' },
                            },
                          },
                          {
                            kind: 'ObjectField',
                            name: { kind: 'Name', value: 'granularity' },
                            value: {
                              kind: 'Variable',
                              name: { kind: 'Name', value: 'granularity' },
                            },
                          },
                        ],
                      },
                    },
                  ],
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'StatsSnapshot' },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'StatsSnapshot' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'StatsSnapshot' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'count' } },
          { kind: 'Field', name: { kind: 'Name', value: 'failed' } },
          { kind: 'Field', name: { kind: 'Name', value: 'completed' } },
          { kind: 'Field', name: { kind: 'Name', value: 'startTime' } },
          { kind: 'Field', name: { kind: 'Name', value: 'endTime' } },
          { kind: 'Field', name: { kind: 'Name', value: 'stddev' } },
          { kind: 'Field', name: { kind: 'Name', value: 'mean' } },
          { kind: 'Field', name: { kind: 'Name', value: 'min' } },
          { kind: 'Field', name: { kind: 'Name', value: 'max' } },
          { kind: 'Field', name: { kind: 'Name', value: 'median' } },
          { kind: 'Field', name: { kind: 'Name', value: 'p90' } },
          { kind: 'Field', name: { kind: 'Name', value: 'p95' } },
          { kind: 'Field', name: { kind: 'Name', value: 'p99' } },
          { kind: 'Field', name: { kind: 'Name', value: 'p995' } },
          { kind: 'Field', name: { kind: 'Name', value: 'meanRate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'm1Rate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'm5Rate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'm15Rate' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useGetPageQueueStatsQuery__
 *
 * To run a query within a React component, call `useGetPageQueueStatsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetPageQueueStatsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetPageQueueStatsQuery({
 *   variables: {
 *      id: // value for 'id'
 *      range: // value for 'range'
 *      granularity: // value for 'granularity'
 *   },
 * });
 */
export function useGetPageQueueStatsQuery(
  baseOptions: Apollo.QueryHookOptions<
    GetPageQueueStatsQuery,
    GetPageQueueStatsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<
    GetPageQueueStatsQuery,
    GetPageQueueStatsQueryVariables
  >(GetPageQueueStatsDocument, options);
}
export function useGetPageQueueStatsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetPageQueueStatsQuery,
    GetPageQueueStatsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<
    GetPageQueueStatsQuery,
    GetPageQueueStatsQueryVariables
  >(GetPageQueueStatsDocument, options);
}
export type GetPageQueueStatsQueryHookResult = ReturnType<
  typeof useGetPageQueueStatsQuery
>;
export type GetPageQueueStatsLazyQueryHookResult = ReturnType<
  typeof useGetPageQueueStatsLazyQuery
>;
export type GetPageQueueStatsQueryResult = Apollo.QueryResult<
  GetPageQueueStatsQuery,
  GetPageQueueStatsQueryVariables
>;
export function refetchGetPageQueueStatsQuery(
  variables: GetPageQueueStatsQueryVariables,
) {
  return { query: GetPageQueueStatsDocument, variables: variables };
}
export const GetStatsSpanDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetStatsSpan' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'StatsSpanInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'queue' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'statsDateRange' },
                  arguments: [
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'input' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'input' },
                      },
                    },
                  ],
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'startTime' },
                      },
                      {
                        kind: 'Field',
                        name: { kind: 'Name', value: 'endTime' },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useGetStatsSpanQuery__
 *
 * To run a query within a React component, call `useGetStatsSpanQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetStatsSpanQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetStatsSpanQuery({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useGetStatsSpanQuery(
  baseOptions: Apollo.QueryHookOptions<
    GetStatsSpanQuery,
    GetStatsSpanQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<GetStatsSpanQuery, GetStatsSpanQueryVariables>(
    GetStatsSpanDocument,
    options,
  );
}
export function useGetStatsSpanLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetStatsSpanQuery,
    GetStatsSpanQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<GetStatsSpanQuery, GetStatsSpanQueryVariables>(
    GetStatsSpanDocument,
    options,
  );
}
export type GetStatsSpanQueryHookResult = ReturnType<
  typeof useGetStatsSpanQuery
>;
export type GetStatsSpanLazyQueryHookResult = ReturnType<
  typeof useGetStatsSpanLazyQuery
>;
export type GetStatsSpanQueryResult = Apollo.QueryResult<
  GetStatsSpanQuery,
  GetStatsSpanQueryVariables
>;
export function refetchGetStatsSpanQuery(
  variables: GetStatsSpanQueryVariables,
) {
  return { query: GetStatsSpanDocument, variables: variables };
}
export const GetQueueStatsDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetQueueStats' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'StatsQueryInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'queue' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'stats' },
                  arguments: [
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'input' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'input' },
                      },
                    },
                  ],
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'StatsSnapshot' },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'StatsSnapshot' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'StatsSnapshot' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'count' } },
          { kind: 'Field', name: { kind: 'Name', value: 'failed' } },
          { kind: 'Field', name: { kind: 'Name', value: 'completed' } },
          { kind: 'Field', name: { kind: 'Name', value: 'startTime' } },
          { kind: 'Field', name: { kind: 'Name', value: 'endTime' } },
          { kind: 'Field', name: { kind: 'Name', value: 'stddev' } },
          { kind: 'Field', name: { kind: 'Name', value: 'mean' } },
          { kind: 'Field', name: { kind: 'Name', value: 'min' } },
          { kind: 'Field', name: { kind: 'Name', value: 'max' } },
          { kind: 'Field', name: { kind: 'Name', value: 'median' } },
          { kind: 'Field', name: { kind: 'Name', value: 'p90' } },
          { kind: 'Field', name: { kind: 'Name', value: 'p95' } },
          { kind: 'Field', name: { kind: 'Name', value: 'p99' } },
          { kind: 'Field', name: { kind: 'Name', value: 'p995' } },
          { kind: 'Field', name: { kind: 'Name', value: 'meanRate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'm1Rate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'm5Rate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'm15Rate' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useGetQueueStatsQuery__
 *
 * To run a query within a React component, call `useGetQueueStatsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetQueueStatsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetQueueStatsQuery({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useGetQueueStatsQuery(
  baseOptions: Apollo.QueryHookOptions<
    GetQueueStatsQuery,
    GetQueueStatsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<GetQueueStatsQuery, GetQueueStatsQueryVariables>(
    GetQueueStatsDocument,
    options,
  );
}
export function useGetQueueStatsLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetQueueStatsQuery,
    GetQueueStatsQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<GetQueueStatsQuery, GetQueueStatsQueryVariables>(
    GetQueueStatsDocument,
    options,
  );
}
export type GetQueueStatsQueryHookResult = ReturnType<
  typeof useGetQueueStatsQuery
>;
export type GetQueueStatsLazyQueryHookResult = ReturnType<
  typeof useGetQueueStatsLazyQuery
>;
export type GetQueueStatsQueryResult = Apollo.QueryResult<
  GetQueueStatsQuery,
  GetQueueStatsQueryVariables
>;
export function refetchGetQueueStatsQuery(
  variables: GetQueueStatsQueryVariables,
) {
  return { query: GetQueueStatsDocument, variables: variables };
}
export const GetQueueStatsLatestDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetQueueStatsLatest' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'StatsLatestInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'queue' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'lastStatsSnapshot' },
                  arguments: [
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'input' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'input' },
                      },
                    },
                  ],
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'StatsSnapshot' },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'StatsSnapshot' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'StatsSnapshot' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'count' } },
          { kind: 'Field', name: { kind: 'Name', value: 'failed' } },
          { kind: 'Field', name: { kind: 'Name', value: 'completed' } },
          { kind: 'Field', name: { kind: 'Name', value: 'startTime' } },
          { kind: 'Field', name: { kind: 'Name', value: 'endTime' } },
          { kind: 'Field', name: { kind: 'Name', value: 'stddev' } },
          { kind: 'Field', name: { kind: 'Name', value: 'mean' } },
          { kind: 'Field', name: { kind: 'Name', value: 'min' } },
          { kind: 'Field', name: { kind: 'Name', value: 'max' } },
          { kind: 'Field', name: { kind: 'Name', value: 'median' } },
          { kind: 'Field', name: { kind: 'Name', value: 'p90' } },
          { kind: 'Field', name: { kind: 'Name', value: 'p95' } },
          { kind: 'Field', name: { kind: 'Name', value: 'p99' } },
          { kind: 'Field', name: { kind: 'Name', value: 'p995' } },
          { kind: 'Field', name: { kind: 'Name', value: 'meanRate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'm1Rate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'm5Rate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'm15Rate' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useGetQueueStatsLatestQuery__
 *
 * To run a query within a React component, call `useGetQueueStatsLatestQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetQueueStatsLatestQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetQueueStatsLatestQuery({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useGetQueueStatsLatestQuery(
  baseOptions: Apollo.QueryHookOptions<
    GetQueueStatsLatestQuery,
    GetQueueStatsLatestQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<
    GetQueueStatsLatestQuery,
    GetQueueStatsLatestQueryVariables
  >(GetQueueStatsLatestDocument, options);
}
export function useGetQueueStatsLatestLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetQueueStatsLatestQuery,
    GetQueueStatsLatestQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<
    GetQueueStatsLatestQuery,
    GetQueueStatsLatestQueryVariables
  >(GetQueueStatsLatestDocument, options);
}
export type GetQueueStatsLatestQueryHookResult = ReturnType<
  typeof useGetQueueStatsLatestQuery
>;
export type GetQueueStatsLatestLazyQueryHookResult = ReturnType<
  typeof useGetQueueStatsLatestLazyQuery
>;
export type GetQueueStatsLatestQueryResult = Apollo.QueryResult<
  GetQueueStatsLatestQuery,
  GetQueueStatsLatestQueryVariables
>;
export function refetchGetQueueStatsLatestQuery(
  variables: GetQueueStatsLatestQueryVariables,
) {
  return { query: GetQueueStatsLatestDocument, variables: variables };
}
export const GetHostStatsLatestDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'query',
      name: { kind: 'Name', value: 'GetHostStatsLatest' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: { kind: 'Variable', name: { kind: 'Name', value: 'id' } },
          type: {
            kind: 'NonNullType',
            type: { kind: 'NamedType', name: { kind: 'Name', value: 'ID' } },
          },
        },
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'StatsLatestInput' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'host' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'id' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'id' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'Field',
                  name: { kind: 'Name', value: 'lastStatsSnapshot' },
                  arguments: [
                    {
                      kind: 'Argument',
                      name: { kind: 'Name', value: 'input' },
                      value: {
                        kind: 'Variable',
                        name: { kind: 'Name', value: 'input' },
                      },
                    },
                  ],
                  selectionSet: {
                    kind: 'SelectionSet',
                    selections: [
                      {
                        kind: 'FragmentSpread',
                        name: { kind: 'Name', value: 'StatsSnapshot' },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'StatsSnapshot' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'StatsSnapshot' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'count' } },
          { kind: 'Field', name: { kind: 'Name', value: 'failed' } },
          { kind: 'Field', name: { kind: 'Name', value: 'completed' } },
          { kind: 'Field', name: { kind: 'Name', value: 'startTime' } },
          { kind: 'Field', name: { kind: 'Name', value: 'endTime' } },
          { kind: 'Field', name: { kind: 'Name', value: 'stddev' } },
          { kind: 'Field', name: { kind: 'Name', value: 'mean' } },
          { kind: 'Field', name: { kind: 'Name', value: 'min' } },
          { kind: 'Field', name: { kind: 'Name', value: 'max' } },
          { kind: 'Field', name: { kind: 'Name', value: 'median' } },
          { kind: 'Field', name: { kind: 'Name', value: 'p90' } },
          { kind: 'Field', name: { kind: 'Name', value: 'p95' } },
          { kind: 'Field', name: { kind: 'Name', value: 'p99' } },
          { kind: 'Field', name: { kind: 'Name', value: 'p995' } },
          { kind: 'Field', name: { kind: 'Name', value: 'meanRate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'm1Rate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'm5Rate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'm15Rate' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useGetHostStatsLatestQuery__
 *
 * To run a query within a React component, call `useGetHostStatsLatestQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetHostStatsLatestQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetHostStatsLatestQuery({
 *   variables: {
 *      id: // value for 'id'
 *      input: // value for 'input'
 *   },
 * });
 */
export function useGetHostStatsLatestQuery(
  baseOptions: Apollo.QueryHookOptions<
    GetHostStatsLatestQuery,
    GetHostStatsLatestQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useQuery<
    GetHostStatsLatestQuery,
    GetHostStatsLatestQueryVariables
  >(GetHostStatsLatestDocument, options);
}
export function useGetHostStatsLatestLazyQuery(
  baseOptions?: Apollo.LazyQueryHookOptions<
    GetHostStatsLatestQuery,
    GetHostStatsLatestQueryVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useLazyQuery<
    GetHostStatsLatestQuery,
    GetHostStatsLatestQueryVariables
  >(GetHostStatsLatestDocument, options);
}
export type GetHostStatsLatestQueryHookResult = ReturnType<
  typeof useGetHostStatsLatestQuery
>;
export type GetHostStatsLatestLazyQueryHookResult = ReturnType<
  typeof useGetHostStatsLatestLazyQuery
>;
export type GetHostStatsLatestQueryResult = Apollo.QueryResult<
  GetHostStatsLatestQuery,
  GetHostStatsLatestQueryVariables
>;
export function refetchGetHostStatsLatestQuery(
  variables: GetHostStatsLatestQueryVariables,
) {
  return { query: GetHostStatsLatestDocument, variables: variables };
}
export const QueueStatsUpdatedDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'subscription',
      name: { kind: 'Name', value: 'QueueStatsUpdated' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'StatsUpdatedSubscriptionFilter' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'onQueueStatsUpdated' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'StatsSnapshot' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'StatsSnapshot' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'StatsSnapshot' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'count' } },
          { kind: 'Field', name: { kind: 'Name', value: 'failed' } },
          { kind: 'Field', name: { kind: 'Name', value: 'completed' } },
          { kind: 'Field', name: { kind: 'Name', value: 'startTime' } },
          { kind: 'Field', name: { kind: 'Name', value: 'endTime' } },
          { kind: 'Field', name: { kind: 'Name', value: 'stddev' } },
          { kind: 'Field', name: { kind: 'Name', value: 'mean' } },
          { kind: 'Field', name: { kind: 'Name', value: 'min' } },
          { kind: 'Field', name: { kind: 'Name', value: 'max' } },
          { kind: 'Field', name: { kind: 'Name', value: 'median' } },
          { kind: 'Field', name: { kind: 'Name', value: 'p90' } },
          { kind: 'Field', name: { kind: 'Name', value: 'p95' } },
          { kind: 'Field', name: { kind: 'Name', value: 'p99' } },
          { kind: 'Field', name: { kind: 'Name', value: 'p995' } },
          { kind: 'Field', name: { kind: 'Name', value: 'meanRate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'm1Rate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'm5Rate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'm15Rate' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useQueueStatsUpdatedSubscription__
 *
 * To run a query within a React component, call `useQueueStatsUpdatedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useQueueStatsUpdatedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useQueueStatsUpdatedSubscription({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useQueueStatsUpdatedSubscription(
  baseOptions: Apollo.SubscriptionHookOptions<
    QueueStatsUpdatedSubscription,
    QueueStatsUpdatedSubscriptionVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useSubscription<
    QueueStatsUpdatedSubscription,
    QueueStatsUpdatedSubscriptionVariables
  >(QueueStatsUpdatedDocument, options);
}
export type QueueStatsUpdatedSubscriptionHookResult = ReturnType<
  typeof useQueueStatsUpdatedSubscription
>;
export type QueueStatsUpdatedSubscriptionResult =
  Apollo.SubscriptionResult<QueueStatsUpdatedSubscription>;
export const HostStatsUpdatedDocument = {
  kind: 'Document',
  definitions: [
    {
      kind: 'OperationDefinition',
      operation: 'subscription',
      name: { kind: 'Name', value: 'HostStatsUpdated' },
      variableDefinitions: [
        {
          kind: 'VariableDefinition',
          variable: {
            kind: 'Variable',
            name: { kind: 'Name', value: 'input' },
          },
          type: {
            kind: 'NonNullType',
            type: {
              kind: 'NamedType',
              name: { kind: 'Name', value: 'StatsUpdatedSubscriptionFilter' },
            },
          },
        },
      ],
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          {
            kind: 'Field',
            name: { kind: 'Name', value: 'onHostStatsUpdated' },
            arguments: [
              {
                kind: 'Argument',
                name: { kind: 'Name', value: 'input' },
                value: {
                  kind: 'Variable',
                  name: { kind: 'Name', value: 'input' },
                },
              },
            ],
            selectionSet: {
              kind: 'SelectionSet',
              selections: [
                {
                  kind: 'FragmentSpread',
                  name: { kind: 'Name', value: 'StatsSnapshot' },
                },
              ],
            },
          },
        ],
      },
    },
    {
      kind: 'FragmentDefinition',
      name: { kind: 'Name', value: 'StatsSnapshot' },
      typeCondition: {
        kind: 'NamedType',
        name: { kind: 'Name', value: 'StatsSnapshot' },
      },
      selectionSet: {
        kind: 'SelectionSet',
        selections: [
          { kind: 'Field', name: { kind: 'Name', value: 'count' } },
          { kind: 'Field', name: { kind: 'Name', value: 'failed' } },
          { kind: 'Field', name: { kind: 'Name', value: 'completed' } },
          { kind: 'Field', name: { kind: 'Name', value: 'startTime' } },
          { kind: 'Field', name: { kind: 'Name', value: 'endTime' } },
          { kind: 'Field', name: { kind: 'Name', value: 'stddev' } },
          { kind: 'Field', name: { kind: 'Name', value: 'mean' } },
          { kind: 'Field', name: { kind: 'Name', value: 'min' } },
          { kind: 'Field', name: { kind: 'Name', value: 'max' } },
          { kind: 'Field', name: { kind: 'Name', value: 'median' } },
          { kind: 'Field', name: { kind: 'Name', value: 'p90' } },
          { kind: 'Field', name: { kind: 'Name', value: 'p95' } },
          { kind: 'Field', name: { kind: 'Name', value: 'p99' } },
          { kind: 'Field', name: { kind: 'Name', value: 'p995' } },
          { kind: 'Field', name: { kind: 'Name', value: 'meanRate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'm1Rate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'm5Rate' } },
          { kind: 'Field', name: { kind: 'Name', value: 'm15Rate' } },
        ],
      },
    },
  ],
} as unknown as DocumentNode;

/**
 * __useHostStatsUpdatedSubscription__
 *
 * To run a query within a React component, call `useHostStatsUpdatedSubscription` and pass it any options that fit your needs.
 * When your component renders, `useHostStatsUpdatedSubscription` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the subscription, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useHostStatsUpdatedSubscription({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useHostStatsUpdatedSubscription(
  baseOptions: Apollo.SubscriptionHookOptions<
    HostStatsUpdatedSubscription,
    HostStatsUpdatedSubscriptionVariables
  >,
) {
  const options = { ...defaultOptions, ...baseOptions };
  return Apollo.useSubscription<
    HostStatsUpdatedSubscription,
    HostStatsUpdatedSubscriptionVariables
  >(HostStatsUpdatedDocument, options);
}
export type HostStatsUpdatedSubscriptionHookResult = ReturnType<
  typeof useHostStatsUpdatedSubscription
>;
export type HostStatsUpdatedSubscriptionResult =
  Apollo.SubscriptionResult<HostStatsUpdatedSubscription>;
