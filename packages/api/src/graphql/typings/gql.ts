/* eslint-disable */
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
  /**
   * A metric name has a string name like "clientCount", and an optional list
   *   of tags, each of which has a string name and value (for example key "host", value "production").
   *   Tags allow the same metric to be measured along several different dimensions and collated later.
   */
  MetricName: any;
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
  isActive: Scalars['Boolean'];
  rule: Rule;
};

export type AddJobLogInput = {
  /** The id of the job */
  id: Scalars['ID'];
  /** The message to log */
  message: Scalars['String'];
  /** The id of the queue the job belongs to */
  queueId: Scalars['ID'];
};

export type AddJobLogResult = {
  /** The number of log entries after adding */
  count: Scalars['Int'];
};

export enum AggregationType {
  Avg = 'AVG',
  Count = 'COUNT',
  Latest = 'LATEST',
  Max = 'MAX',
  Min = 'MIN',
  P90 = 'P90',
  P95 = 'P95',
  P99 = 'P99',
  Sum = 'SUM',
}

export type AppInfo = {
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
  queue: Queue;
  status: Array<Maybe<BulkStatusItem>>;
};

export type BulkJobItemInput = {
  data: Scalars['JSONObject'];
  name: Scalars['String'];
  options?: InputMaybe<JobOptionsInput>;
};

export type BulkStatusItem = {
  id: Scalars['ID'];
  reason?: Maybe<Scalars['String']>;
  success: Scalars['Boolean'];
};

export type ChangeConditionInput = {
  aggregationType: AggregationType;
  changeType: ConditionChangeType;
  /** The value needed to trigger an error notification */
  errorThreshold: Scalars['Float'];
  /** The comparison operator */
  operator: RuleOperator;
  /** Lookback period (ms). How far back are we going to compare eg 1 hour means we are comparing now vs 1 hour ago */
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

export enum CleanQueueJobType {
  Active = 'active',
  Completed = 'completed',
  Delayed = 'delayed',
  Failed = 'failed',
  Paused = 'paused',
  Wait = 'wait',
}

export type ClearRuleAlertsResult = {
  /** The count of deleted alerts */
  deletedItems: Scalars['Int'];
  rule: Rule;
};

export type ClesrRuleAlertsInput = {
  queueId: Scalars['ID'];
  ruleId: Scalars['ID'];
};

export enum ConditionChangeType {
  Change = 'CHANGE',
  Pct = 'PCT',
}

export type CreateBulkJobsResult = {
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
  /** The name of the metric */
  name: Scalars['String'];
  /** The id of the queue to which the metric belongs */
  queueId: Scalars['ID'];
  type: MetricType;
};

export type CreateRepeatableJobByCronInput = {
  data?: InputMaybe<Scalars['JSONObject']>;
  jobName: Scalars['ID'];
  options?: InputMaybe<JobOptionsInput>;
  queueId: Scalars['ID'];
};

export type CreateRepeatableJobByCronResult = {
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
  filterId: Scalars['String'];
  isDeleted: Scalars['Boolean'];
  queue: Queue;
};

export type DeleteJobPayload = {
  job: Job;
  queue: Queue;
};

export type DeleteJobSchemaInput = {
  jobName: Scalars['String'];
  queueId: Scalars['ID'];
};

export type DeleteJobSchemaResult = {
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
  /** The number of jobs removed this iteration */
  removed: Scalars['Int'];
};

export type DeleteMetricInput = {
  metricId: Scalars['ID'];
  queueId: Scalars['ID'];
};

export type DeleteMetricResult = {
  isDeleted: Scalars['Boolean'];
  queue: Queue;
};

export type DeleteNotificationChannelResult = {
  channelId: Scalars['ID'];
  deleted: Scalars['Boolean'];
  hostId: Scalars['ID'];
};

export type DeleteQueueDeleteResult = {
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
  granularity?: InputMaybe<MetricGranularity>;
  queueId: Scalars['ID'];
};

export type DeleteQueueStatsResult = {
  isDeleted: Scalars['Boolean'];
  queue: Queue;
};

export type DeleteRepeatableJobByKeyInput = {
  key: Scalars['String'];
  queueId: Scalars['ID'];
};

export type DeleteRepeatableJobByKeyResult = {
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
  queue: Queue;
};

export type DeleteRuleAlertInput = {
  alertId: Scalars['ID'];
  queueId: Scalars['ID'];
  ruleId: Scalars['ID'];
};

export type DeleteRuleAlertResult = {
  isDeleted: Scalars['Boolean'];
  rule?: Maybe<Rule>;
  ruleId: Scalars['ID'];
};

export type DeleteRuleInput = {
  queueId: Scalars['ID'];
  ruleId: Scalars['ID'];
};

export type DeleteRuleResult = {
  isDeleted: Scalars['Boolean'];
  queueId: Scalars['ID'];
  ruleId: Scalars['ID'];
};

export type DisableNotificationChannelResult = {
  updated: Scalars['Boolean'];
};

/** Marks a job to not be retried if it fails (even if attempts has been configured) */
export type DiscardJobResult = {
  job: Job;
};

export type DiscoverQueuesPayload = {
  /** The queue name */
  name: Scalars['String'];
  /** The queue prefix */
  prefix: Scalars['String'];
};

export type DrainQueueResult = {
  queue: Queue;
};

export type EnableNotificationChannelResult = {
  updated: Scalars['Boolean'];
};

export enum ErrorLevel {
  Error = 'ERROR',
  None = 'NONE',
  Warning = 'WARNING',
}

export type FindJobsInput = {
  /** The cursor to start from */
  cursor?: InputMaybe<Scalars['String']>;
  /** A JS compatible Search expression, e.g (name === "transcode") && (responseTime > 10000) */
  expression?: InputMaybe<Scalars['String']>;
  /** Optionally filter jobs by id pattern e.g. foo?-* */
  pattern?: InputMaybe<Scalars['String']>;
  /** The id of the desired queue */
  queueId: Scalars['ID'];
  scanCount?: InputMaybe<Scalars['Int']>;
  /** Optionally filter jobs by status */
  status?: InputMaybe<JobSearchStatus>;
};

export type FindJobsResult = {
  /** Total current index of the end of the last set of jobs returned */
  current: Scalars['Int'];
  jobs: Array<Job>;
  nextCursor: Scalars['ID'];
  /** Total number of jobs in the given state, but not necessarily the filtered count */
  total: Scalars['Int'];
};

export enum FinishedStatus {
  Completed = 'completed',
  Failed = 'failed',
}

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

export enum HttpMethodEnum {
  Get = 'GET',
  Post = 'POST',
}

export type InferJobSchemaInput = {
  jobName?: InputMaybe<Scalars['String']>;
  queueId: Scalars['ID'];
};

export type Job = {
  /** Number of attempts after the job has failed. */
  attemptsMade: Scalars['Int'];
  /** Get this jobs children result values as an object indexed by job key, if any. */
  childrenValues: Scalars['JSONObject'];
  data: Scalars['JSONObject'];
  delay: Scalars['Int'];
  /** Get children job keys if this job is a parent and has children. */
  dependencies: JobDependenciesPayload;
  /** Get children job counts if this job is a parent and has children. */
  dependenciesCount: JobDependenciesCountPayload;
  /** The reason why the job failed. */
  failedReason?: Maybe<Scalars['JSON']>;
  /** Timestamp when the job was finished (completed or failed). */
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
  /** Fully qualified key (including the queue prefix) pointing to the parent of this job. */
  parentKey?: Maybe<Scalars['String']>;
  /** Returns the parent queue of a job that is part of a flow */
  parentQueue?: Maybe<Queue>;
  /** Timestamp when the job was processed. */
  processedOn?: Maybe<Scalars['Date']>;
  /** The progress a job has performed so far. */
  progress?: Maybe<Scalars['JobProgress']>;
  queueId: Scalars['String'];
  /** The name of the queue this job belongs to */
  queueName: Scalars['String'];
  /** The value returned by the processor when processing this job. */
  returnvalue?: Maybe<Scalars['JSON']>;
  /** Stacktrace for the error (for failed jobs). */
  stacktrace: Array<Scalars['String']>;
  state?: Maybe<JobState>;
  /** Timestamp when the job was added to the queue (unless overridden with job options). */
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
  job: Job;
};

/** The count of jobs according to status */
export type JobCounts = {
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
  processed?: Maybe<Scalars['Int']>;
  unprocessed?: Maybe<Scalars['Int']>;
};

export type JobDependenciesOptsInput = {
  processed?: InputMaybe<JobDependencyCursorInput>;
  unprocessed?: InputMaybe<JobDependencyCursorInput>;
};

export type JobDependenciesPayload = {
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
  count: Scalars['Int'];
  messages: Array<Scalars['String']>;
};

export type JobMemoryUsagePayload = {
  /** The total number of bytes consumed by the sampled jobs */
  byteCount: Scalars['Int'];
  /** The total number of jobs contributing to the byteCount */
  jobCount: Scalars['Int'];
};

export type JobNode = {
  children?: Maybe<Array<Job>>;
  job: Job;
};

export type JobOptions = {
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

export enum JobSearchStatus {
  Active = 'active',
  Completed = 'completed',
  Delayed = 'delayed',
  Failed = 'failed',
  Paused = 'paused',
  Waiting = 'waiting',
  WaitingChildren = 'waiting_children',
}

export enum JobState {
  Active = 'active',
  Completed = 'completed',
  Delayed = 'delayed',
  Failed = 'failed',
  Waiting = 'waiting',
  WaitingChildren = 'waiting_children',
}

export enum JobType {
  Active = 'active',
  Completed = 'completed',
  Delayed = 'delayed',
  Failed = 'failed',
  Paused = 'paused',
  Repeat = 'repeat',
  Wait = 'wait',
  Waiting = 'waiting',
  WaitingChildren = 'waiting_children',
}

export type JobUpdateDelta = {
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
  alert: RuleAlert;
};

/** Metrics are numeric samples of data collected over time */
export type Metric = {
  /** Aggregates metrics within a range */
  aggregate: Scalars['Int'];
  /** The list of allowed aggregations for this metric. */
  aggregationTypes: Array<Scalars['String']>;
  /** The canonical name of the metric */
  canonicalName: Scalars['String'];
  /** Timestamp of when this metric was created */
  createdAt: Scalars['Date'];
  data: Array<Maybe<TimeseriesDataPoint>>;
  /** Returns the timestamps of the first and last data items recorded for the metric */
  dateRange?: Maybe<TimeSpan>;
  /** A short description of the metric */
  description: Scalars['String'];
  /** the id of the metric */
  id: Scalars['ID'];
  /** The name of the metric */
  name: Scalars['String'];
  /** Uses a rolling mean and a rolling deviation (separate) to identify peaks in metric data */
  outliers: Array<Maybe<TimeseriesDataPoint>>;
  /** Compute a percentile distribution. */
  percentileDistribution: PercentileDistribution;
  /** Returns simple descriptive statistics from a range of metric data */
  summaryStats: SummaryStatistics;
  /** The tags of the metric */
  tags: Array<Scalars['String']>;
  type: MetricType;
  /** The unit of the metric */
  unit: Scalars['String'];
  /** Timestamp of when this metric was created */
  updatedAt: Scalars['Date'];
};

/** Metrics are numeric samples of data collected over time */
export type MetricAggregateArgs = {
  input: MetricsQueryInput;
};

/** Metrics are numeric samples of data collected over time */
export type MetricDataArgs = {
  input: MetricDataInput;
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

export enum MetricCategory {
  Host = 'Host',
  Queue = 'Queue',
  Redis = 'Redis',
}

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

export enum MetricGranularity {
  Day = 'Day',
  Hour = 'Hour',
  Minute = 'Minute',
  Month = 'Month',
  Week = 'Week',
}

export type MetricInfo = {
  category: MetricCategory;
  description?: Maybe<Scalars['String']>;
  key: Scalars['String'];
  type: MetricType;
  unit?: Maybe<Scalars['String']>;
  valueType: MetricValueType;
};

/** Input fields for updating a metric */
export type MetricInput = {
  /** the id of the metric */
  id: Scalars['ID'];
  /** The name of the metric */
  name?: InputMaybe<Scalars['String']>;
  /** The id of the queue to which the metric belongs */
  queueId: Scalars['ID'];
  type: MetricType;
};

export type MetricPercentileDistributionInput = {
  from: Scalars['Date'];
  outlierFilter?: InputMaybe<OutlierFilterInput>;
  /** The percentiles to get frequencies for */
  percentiles?: InputMaybe<Array<Scalars['Float']>>;
  to: Scalars['Date'];
};

export enum MetricStatusType {
  Completed = 'completed',
  Failed = 'failed',
}

/** Available metric names */
export enum MetricType {
  CompletedPercentage = 'completed_percentage',
  FailedPercentage = 'failed_percentage',
  JobAttempts = 'job_attempts',
  JobAvgAttempts = 'job_avg_attempts',
  JobsActive = 'jobs_active',
  JobsCompleted = 'jobs_completed',
  JobsDelayed = 'jobs_delayed',
  JobsFailed = 'jobs_failed',
  JobsFinished = 'jobs_finished',
  JobsPending = 'jobs_pending',
  JobsProcessTimeMs = 'jobs_process_time_ms',
  JobsRuntimeMs = 'jobs_runtime_ms',
  JobsWaitTimeMs = 'jobs_wait_time_ms',
  JobsWaiting = 'jobs_waiting',
  JobsWaitingChildren = 'jobs_waiting_children',
  PausedQueues = 'paused_queues',
  Queues = 'queues',
  RedisConnectedClients = 'redis_connected_clients',
  RedisInstantaneousOpsPerSec = 'redis_instantaneous_ops_per_sec',
  RedisMemFragmentationRatio = 'redis_mem_fragmentation_ratio',
  RedisUsedMemory = 'redis_used_memory',
  RedisUsedMemoryPeak = 'redis_used_memory_peak',
  Workers = 'workers',
}

export enum MetricValueType {
  Count = 'Count',
  Gauge = 'Gauge',
  Rate = 'Rate',
}

export type MetricsDataInput = {
  /** The end of the date range to query */
  end?: InputMaybe<Scalars['DateTime']>;
  /** The start of the date range to query */
  start?: InputMaybe<Scalars['DateTime']>;
  /** The type of metric to fetch */
  type: MetricStatusType;
};

/** Metrics filter. */
export type MetricsQueryInput = {
  aggregator: AggregationType;
  /** Range end */
  end: Scalars['Date'];
  /** Stats snapshot granularity */
  granularity?: InputMaybe<MetricGranularity>;
  /** The metric requested */
  metric: MetricType;
  /** Range start */
  start: Scalars['Date'];
};

export type MetricsTimeseries = {
  /** The data points for the timeseries. */
  data: Array<TimeseriesDataPoint>;
  /** Metadata about the timeseries */
  meta: TimeseriesMeta;
};

export type MoveJobToCompletedResult = {
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
  job: Job;
  queue: Queue;
};

export type Mutation = {
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
  /** Update job data */
  updateJob: Job;
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
  input: AddJobLogInput;
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
  input: UpdateJobDataInput;
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
  jobId: Scalars['String'];
  jobName: Scalars['String'];
  queueId: Scalars['String'];
  queueName: Scalars['String'];
};

export type OnJobDelayedPayload = {
  delay?: Maybe<Scalars['Int']>;
  job?: Maybe<Job>;
  jobId: Scalars['String'];
  queue: Queue;
};

export type OnJobLogAddedPayload = {
  /** The number of log lines after addition */
  count: Scalars['Int'];
  job: Job;
  jobId: Scalars['String'];
  queueId: Scalars['String'];
  /** The rows added to the job log */
  rows: Array<Scalars['String']>;
};

export type OnJobProgressPayload = {
  job: Job;
  progress?: Maybe<Scalars['JobProgress']>;
  queue: Queue;
};

export type OnJobRemovedPayload = {
  jobId: Scalars['String'];
  queue: Queue;
};

export type OnJobStateChangePayload = {
  job: Job;
  queue: Queue;
};

/** Holds the changes to the state of a job */
export type OnJobUpdatedPayload = {
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
  channelId: Scalars['String'];
  channelName: Scalars['String'];
  channelType: Scalars['String'];
  hostId: Scalars['String'];
};

export type OnNotificationChannelDeletedPayload = {
  channelId: Scalars['String'];
  channelName: Scalars['String'];
  channelType: Scalars['String'];
  hostId: Scalars['String'];
};

export type OnQueueDeletedPayload = {
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
  delta?: Maybe<QueueJobCountDelta>;
  queueId: Scalars['String'];
};

export type OnQueueJobUpdatesPayload = {
  changes: Array<JobUpdateDelta>;
  queueId: Scalars['String'];
};

export type OnQueuePausedPayload = {
  queueId: Scalars['String'];
};

export type OnQueueRegisteredPayload = {
  hostId: Scalars['String'];
  prefix: Scalars['String'];
  queueId: Scalars['String'];
  queueName: Scalars['String'];
};

export type OnQueueResumedPayload = {
  queueId: Scalars['String'];
};

export type OnQueueStateChangedPayload = {
  queueId: Scalars['String'];
  queueName: Scalars['String'];
  state: Scalars['String'];
};

export type OnQueueUnregisteredPayload = {
  hostId: Scalars['String'];
  prefix: Scalars['String'];
  queueId: Scalars['String'];
  queueName: Scalars['String'];
};

/** Returns the list of added and removed workers related to a queue */
export type OnQueueWorkersChangedPayload = {
  added: Array<QueueWorker>;
  queueId: Scalars['String'];
  removed: Array<QueueWorker>;
};

export type OnQueueWorkersCountPayload = {
  queueId: Scalars['String'];
  workersCount: Scalars['Int'];
};

export type OnRuleAlertPayload = {
  alert: RuleAlert;
};

/** Method used for outlier detection */
export enum OutlierDetectionMethod {
  /** Detect outliers based on the Inter Quartile Range. */
  Iqr = 'IQR',
  /** Detect outliers based on Iglewicz and Hoaglin (Mean Absolute Deviation). */
  Mad = 'MAD',
  /** Detect outliers based on deviations from the mean. */
  Sigma = 'Sigma',
}

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

export enum PeakSignalDirection {
  Above = 'ABOVE',
  Below = 'BELOW',
  Both = 'BOTH',
}

export type PercentileCount = {
  count: Scalars['Int'];
  /** The percentile value */
  value: Scalars['Float'];
};

/** Percentile distribution of metric values */
export type PercentileDistribution = {
  /** The maximum value in the data range. */
  max: Scalars['Float'];
  /** The minimum value in the data range. */
  min: Scalars['Float'];
  percentiles: Array<PercentileCount>;
  /** The total number of values. */
  totalCount: Scalars['Int'];
};

export type PingPayload = {
  latency: Scalars['Int'];
};

export type PromoteJobResult = {
  job: Job;
  queue: Queue;
};

export type Query = {
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
  /** Get a list of jobs by id */
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
  /** Queue configuration */
  config?: Maybe<QueueConfig>;
  /** Returns the current default job options of the specified queue. */
  defaultJobOptions?: Maybe<JobOptions>;
  host: Scalars['String'];
  hostId: Scalars['ID'];
  id: Scalars['String'];
  /** Returns true if the queue is currently paused. */
  isPaused: Scalars['Boolean'];
  /** Returns true if the queue is readonly */
  isReadonly: Scalars['Boolean'];
  jobCounts: JobCounts;
  /** Get the average runtime duration of completed jobs in the queue */
  jobDurationAvg: Scalars['Int'];
  jobFilters: Array<JobFilter>;
  /** Get the average memory used by jobs in the queue */
  jobMemoryAvg: Scalars['Float'];
  /** Get the average memory used by jobs in the queue */
  jobMemoryUsage: JobMemoryUsagePayload;
  /** Returns a list of all job names in the queue, including those that are have schemas. */
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
  prefix: Scalars['String'];
  /** Returns the number of repeatable jobs */
  repeatableJobCount: Scalars['Int'];
  /** Get repeatable meta jobs. */
  repeatableJobs: Array<RepeatableJob>;
  /** Returns the count of rule alerts associated with a Queue */
  ruleAlertCount: Scalars['Int'];
  /** Gets rule alerts associated with the queue */
  ruleAlerts: Array<RuleAlert>;
  rules: Array<Rule>;
  schedulerCount: Scalars['Int'];
  schedulers: Array<QueueScheduler>;
  /** Queries for metric snapshots within a range */
  stats: Array<StatsSnapshot>;
  /** Aggregates queue metrics within a range */
  statsAggregate?: Maybe<StatsSnapshot>;
  /** Gets the time range of recorded stats for a queue/host */
  statsDateRange?: Maybe<TimeSpan>;
  /** Get the average time a job spends in the queue before being processed */
  waitTimeAvg: Scalars['Int'];
  /** Returns the number of child jobs waiting to be processed. */
  waitingChildrenCount: Scalars['Int'];
  /** Returns the number of jobs waiting to be processed. */
  waitingCount: Scalars['Int'];
  workerCount: Scalars['Int'];
  workers: Array<QueueWorker>;
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
  /** Returns the number of affected jobs */
  count: Scalars['Int'];
  /** The queue id */
  id: Scalars['ID'];
  /** Returns a list of cleared job ids */
  jobIds?: Maybe<Array<Scalars['ID']>>;
};

/** Queue configuration */
export type QueueConfig = {
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

export enum QueueFilterStatus {
  Active = 'Active',
  Inactive = 'Inactive',
  Paused = 'Paused',
  Running = 'Running',
}

export type QueueHost = {
  /** Returns the number of alerts raised across all the queues associated with this host */
  alertCount: Scalars['Int'];
  /** Notification channels for alerts */
  channels: Array<NotificationChannel>;
  /** An optional description of the host */
  description?: Maybe<Scalars['String']>;
  /** Discover Bull queues on the given host */
  discoverQueues: Array<DiscoverQueuesPayload>;
  id: Scalars['ID'];
  /** Get job counts for a host */
  jobCounts: JobCounts;
  /** Gets the last recorded queue stats snapshot for a metric */
  lastStatsSnapshot?: Maybe<StatsSnapshot>;
  /** The name of the host */
  name: Scalars['String'];
  ping: PingPayload;
  /** The count of queues registered for this host */
  queueCount: Scalars['Int'];
  /** The queues registered for this host */
  queues: Array<Queue>;
  redis: RedisInfo;
  /** Queries for metric snapshots within a range */
  stats: Array<StatsSnapshot>;
  /** Aggregates queue metrics within a range */
  statsAggregate?: Maybe<StatsSnapshot>;
  /** Gets the time range of recorded stats for a queue/host */
  statsDateRange?: Maybe<TimeSpan>;
  uri: Scalars['String'];
  /** Returns the number of workers associated with managed queues on this host */
  workerCount: Scalars['Int'];
  workers: Array<QueueWorker>;
};

export type QueueHostDiscoverQueuesArgs = {
  prefix?: InputMaybe<Scalars['String']>;
  unregisteredOnly?: InputMaybe<Scalars['Boolean']>;
};

export type QueueHostLastStatsSnapshotArgs = {
  input?: InputMaybe<StatsLatestInput>;
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

export type QueueHostWorkersArgs = {
  limit?: InputMaybe<Scalars['Int']>;
};

export type QueueJobCountDelta = {
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

export type RegisterQueueInput = {
  checkExists?: InputMaybe<Scalars['Boolean']>;
  hostId: Scalars['ID'];
  /** the queue names */
  name: Scalars['String'];
  prefix?: InputMaybe<Scalars['String']>;
  trackMetrics?: InputMaybe<Scalars['Boolean']>;
};

export type RepeatableJob = {
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
  /** Maximum number of jobs to return. */
  limit?: InputMaybe<Scalars['Int']>;
  /** Offset of first job to return. */
  offset?: InputMaybe<Scalars['Int']>;
  /** Determine the order in which jobs are returned based on their next execution time. */
  order?: InputMaybe<SortOrderEnum>;
};

export type RetryJobResult = {
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
  /** the number of retried jobs */
  count?: Maybe<Scalars['Int']>;
};

export type Rule = {
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

export enum RuleCircuitState {
  Closed = 'CLOSED',
  HalfOpen = 'HALF_OPEN',
  Open = 'OPEN',
}

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

export enum RuleOperator {
  Eq = 'EQ',
  Gt = 'GT',
  Gte = 'GTE',
  Lt = 'LT',
  Lte = 'LTE',
  Ne = 'NE',
}

export enum RuleState {
  Error = 'ERROR',
  Muted = 'MUTED',
  Normal = 'NORMAL',
  Warning = 'WARNING',
}

/** Real time status of a Rule */
export type RuleStatus = {
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

export enum RuleType {
  Change = 'CHANGE',
  Peak = 'PEAK',
  Threshold = 'THRESHOLD',
}

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

export enum Severity {
  Critical = 'CRITICAL',
  Error = 'ERROR',
  Info = 'INFO',
  Warning = 'WARNING',
}

/** A channel which sends notifications through slack */
export type SlackNotificationChannel = NotificationChannel & {
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

export enum SortOrderEnum {
  Asc = 'ASC',
  Desc = 'DESC',
}

/** Queue stats filter to getting latest snapshot. */
export type StatsLatestInput = {
  /** Stats snapshot granularity */
  granularity?: InputMaybe<MetricGranularity>;
  /** The metric requested */
  metric?: InputMaybe<Scalars['MetricName']>;
};

/** Queue metrics filter. */
export type StatsQueryInput = {
  end: Scalars['Date'];
  /** Snapshot granularity */
  granularity?: InputMaybe<MetricGranularity>;
  /** The metric requested */
  metric: MetricType;
  /** An expression specifying the range to query e.g. yesterday, last_7days */
  range: Scalars['String'];
  start: Scalars['Date'];
};

/** Stats snapshot. */
export type StatsSnapshot = {
  /** The number of samples */
  count: Scalars['Int'];
  /** The maximum value in the data set */
  max: Scalars['Float'];
  /** The average of values during the period */
  mean: Scalars['Float'];
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
  /** The standard deviation of the dataset over the sample period */
  stddev: Scalars['Float'];
};

export type StatsSpanInput = {
  granularity?: InputMaybe<MetricGranularity>;
  /** The host/queue to query */
  id: Scalars['ID'];
  jobName?: InputMaybe<Scalars['String']>;
  metric: MetricType;
};

export type Subscription = {
  /** Returns job active events */
  obJobActive?: Maybe<OnJobStateChangePayload>;
  /** Returns job completed events */
  obJobCompleted?: Maybe<OnJobStateChangePayload>;
  /** Returns job failed events */
  obJobFailed?: Maybe<OnJobStateChangePayload>;
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
  onQueuePaused: OnQueuePausedPayload;
  onQueueRegistered: OnQueueRegisteredPayload;
  onQueueResumed: OnQueueResumedPayload;
  onQueueStateChanged: OnQueueStateChangedPayload;
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
  endTime: Scalars['DateTime'];
  startTime: Scalars['DateTime'];
};

export type TimeseriesDataPoint = TimeseriesDataPointInterface & {
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
  /** Number of total datapoints in the timeseries */
  count: Scalars['Int'];
  /** Unix timestamp (millis) of the last datapoint of the timeseries */
  endTs: Scalars['Int'];
  /** Unix timestamp (millis) of the first datapoint of the timeseries */
  startTs: Scalars['Int'];
};

export type UnregisterQueueResult = {
  host: QueueHost;
  isRemoved: Scalars['Boolean'];
  queue: Queue;
};

export type UpdateJobDataInput = {
  /** the data that will replace the current jobs data. */
  data: Scalars['JSONObject'];
  jobId: Scalars['ID'];
  queueId: Scalars['ID'];
};

export type UpdateJobFilterInput = {
  expression: Scalars['String'];
  filterId: Scalars['ID'];
  name?: InputMaybe<Scalars['String']>;
  queueId: Scalars['ID'];
  status?: InputMaybe<JobType>;
};

export type UpdateJobFilterResult = {
  filter?: Maybe<JobFilter>;
  isUpdated: Scalars['Boolean'];
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
  jobName: Scalars['String'];
  queueId: Scalars['ID'];
};

export type ValidateJobOptionsResult = {
  errors: Array<Scalars['String']>;
  isValid: Scalars['Boolean'];
};

/** A channel that posts notifications to a webhook */
export type WebhookNotificationChannel = NotificationChannel & {
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
