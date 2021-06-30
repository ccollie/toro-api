export type Maybe<T> = T | null;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  Date: any;
  /** A date-time string at UTC, such as 2007-12-03T10:15:30Z, compliant with the `date-time` format outlined in section 5.6 of the RFC 3339 profile of the ISO 8601 standard for representation of dates and times using the Gregorian calendar. */
  DateTime: any;
  /** Specifies a duration in milliseconds - either as an int or a string specification e.g. "2 min", "3 hr" */
  Duration: any;
  /** A field whose value conforms to the standard internet email address format as specified in RFC822: https://www.w3.org/Protocols/rfc822/. */
  EmailAddress: any;
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
  JSON: any;
  /** The `JSONObject` scalar type represents JSON objects as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
  JSONObject: any;
  /** The `JSONSchema` scalar type represents JSONSchema values as specified by https://json-schema.org/draft/2019-09/json-schema-validation.html. */
  JSONSchema: any;
  /** Job process. Either a number (percentage) or user specified data */
  JobProgress: any;
  /** Specifies the number of jobs to keep after an operation (e.g. complete or fail).A bool(true) causes a job to be removed after the action */
  JobRemoveOption: any;
  /** The javascript `Date` as integer. Type represents date and time as number of milliseconds from start of UNIX epoch. */
  Timestamp: any;
  /** A field whose value conforms to the standard URL format as specified in RFC3986: https://www.ietf.org/rfc/rfc3986.txt. */
  URL: any;
};

export type AggregateInfo = {
  type: AggregateTypeEnum;
  description: Scalars['String'];
  isWindowed: Scalars['Boolean'];
};

export enum AggregateTypeEnum {
  None = 'None',
  Identity = 'Identity',
  Ewma = 'Ewma',
  Latest = 'Latest',
  Min = 'Min',
  Max = 'Max',
  Mean = 'Mean',
  Sum = 'Sum',
  StdDev = 'StdDev',
  Quantile = 'Quantile',
  P75 = 'P75',
  P90 = 'P90',
  P95 = 'P95',
  P99 = 'P99',
  P995 = 'P995'
}

export type Aggregator = {
  type: AggregateTypeEnum;
  options?: Maybe<Scalars['JSONObject']>;
};

export type AggregatorInput = {
  type: AggregateTypeEnum;
  options?: Maybe<Scalars['JSONObject']>;
};

export type AppInfo = {
  /** The server environment (development, production, etc) */
  env: Scalars['String'];
  /** The app title */
  title: Scalars['String'];
  brand?: Maybe<Scalars['String']>;
  /** The api version */
  version: Scalars['String'];
  author?: Maybe<Scalars['String']>;
};

export type BulkJobActionInput = {
  queueId: Scalars['ID'];
  jobIds: Array<Scalars['ID']>;
};

export type BulkJobActionPayload = {
  queue: Queue;
  status: Array<Maybe<BulkStatusItem>>;
};

export type BulkJobItemInput = {
  name: Scalars['String'];
  data: Scalars['JSONObject'];
  options?: Maybe<JobOptionsInput>;
};

export type BulkStatusItem = {
  id: Scalars['ID'];
  success: Scalars['Boolean'];
  reason?: Maybe<Scalars['String']>;
};

export enum ChangeAggregation {
  Max = 'MAX',
  Min = 'MIN',
  Avg = 'AVG',
  Sum = 'SUM',
  P90 = 'P90',
  P95 = 'P95',
  P99 = 'P99'
}

export type ChangeConditionInput = {
  /** The value needed to trigger an error notification */
  errorThreshold: Scalars['Float'];
  /** The value needed to trigger an warning notification */
  warningThreshold?: Maybe<Scalars['Float']>;
  /** The comparison operator */
  operator: RuleOperator;
  /** The sliding window for metric measurement */
  windowSize: Scalars['Duration'];
  /** Lookback period (ms). How far back are we going to compare eg 1 hour means we're comparing now vs 1 hour ago */
  timeShift: Scalars['Duration'];
  changeType: ConditionChangeType;
  aggregationType: ChangeAggregation;
};

export enum ConditionChangeType {
  Change = 'CHANGE',
  Pct = 'PCT'
}



export type DiscoverQueuesPayload = {
  /** The queue name */
  name: Scalars['String'];
  /** The queue prefix */
  prefix: Scalars['String'];
};



export enum ErrorLevel {
  None = 'NONE',
  Warning = 'WARNING',
  Critical = 'CRITICAL'
}

export type HistogramBin = {
  count: Scalars['Int'];
  /** Lower bound of the bin */
  x0: Scalars['Float'];
  /** Upper bound of the bin */
  x1: Scalars['Float'];
};

/** Options for generating histogram bins */
export type HistogramBinOptionsInput = {
  /** Generate a "nice" bin count */
  pretty?: Maybe<Scalars['Boolean']>;
  /** Optional number of bins to select. */
  binCount?: Maybe<Scalars['Int']>;
  /** Method used to compute histogram bin count */
  binMethod?: Maybe<HistogramBinningMethod>;
  /** Optional minimum value to include in counts */
  minValue?: Maybe<Scalars['Float']>;
  /** Optional maximum value to include in counts */
  maxValue?: Maybe<Scalars['Float']>;
};

/** The method used to calculate the optimal bin width (and consequently number of bins) for a histogram */
export enum HistogramBinningMethod {
  /** Maximum of the ‘Sturges’ and ‘Freedman’ estimators. Provides good all around performance. */
  Auto = 'Auto',
  /** Calculate the number of bins based on the Sturges method */
  Sturges = 'Sturges',
  /** Calculate the number of histogram bins based on Freedman-Diaconis method */
  Freedman = 'Freedman'
}

/** Records histogram binning data */
export type HistogramInput = {
  /** An optional job name to filter on */
  jobName?: Maybe<Scalars['String']>;
  /** The metric requested */
  metric?: Maybe<StatsMetricType>;
  /** Stats snapshot granularity */
  granularity: StatsGranularity;
  /** The minimum date to consider */
  from: Scalars['DateTime'];
  /** The maximum date to consider */
  to: Scalars['DateTime'];
  options?: Maybe<HistogramBinOptionsInput>;
};

/** Records histogram binning data */
export type HistogramPayload = {
  /** The total number of values. */
  total: Scalars['Int'];
  /** The minimum value in the data range. */
  min: Scalars['Float'];
  /** The maximum value in the data range. */
  max: Scalars['Float'];
  /** The width of the bins */
  binWidth: Scalars['Float'];
  bins: Array<Maybe<HistogramBin>>;
};

export type HostQueuesFilter = {
  /** Regex pattern for queue name matching */
  search?: Maybe<Scalars['String']>;
  /** Queue prefix */
  prefix?: Maybe<Scalars['String']>;
  /** Statuses to filter on */
  statuses?: Maybe<Array<Maybe<QueueFilterStatus>>>;
  /** Ids of queues to include */
  include?: Maybe<Array<Scalars['String']>>;
  /** Ids of queues to exclude */
  exclude?: Maybe<Array<Scalars['String']>>;
};

export enum HttpMethodEnum {
  Get = 'GET',
  Post = 'POST'
}




export type Job = {
  id: Scalars['ID'];
  name: Scalars['String'];
  data: Scalars['JSONObject'];
  progress?: Maybe<Scalars['JobProgress']>;
  delay: Scalars['Int'];
  timestamp: Scalars['Date'];
  attemptsMade: Scalars['Int'];
  failedReason?: Maybe<Scalars['JSON']>;
  stacktrace: Array<Scalars['String']>;
  returnvalue?: Maybe<Scalars['JSON']>;
  finishedOn?: Maybe<Scalars['Date']>;
  processedOn?: Maybe<Scalars['Date']>;
  opts: JobOptions;
  state: JobStatus;
  queueId: Scalars['String'];
  parentKey?: Maybe<Scalars['String']>;
  logs: JobLogs;
  /** Returns true if this job is either a parent or child node in a flow. */
  isInFlow: Scalars['Boolean'];
  /** returns true if this job is waiting. */
  isWaiting: Scalars['Boolean'];
  /** returns true if this job is waiting for children. */
  isWaitingChildren: Scalars['Boolean'];
  /** Get this jobs children result values as an object indexed by job key, if any. */
  childrenValues: Scalars['JSONObject'];
  /** Returns the parent of a job that is part of a flow */
  parent?: Maybe<Job>;
  /** Get children job keys if this job is a parent and has children. */
  dependencies: JobDependenciesPayload;
  /** Get children job counts if this job is a parent and has children. */
  dependenciesCount: JobDependenciesCountPayload;
};


export type JobLogsArgs = {
  start?: Scalars['Int'];
  end?: Scalars['Int'];
};


export type JobDependenciesArgs = {
  input?: Maybe<JobDependenciesOptsInput>;
};


export type JobDependenciesCountArgs = {
  input?: Maybe<JobDependenciesCountInput>;
};

export type JobAddBulkPayload = {
  jobs: Array<Maybe<Job>>;
};

export type JobAddCronInput = {
  queueId: Scalars['ID'];
  jobName: Scalars['ID'];
  data?: Maybe<Scalars['JSONObject']>;
  options?: Maybe<JobOptionsInput>;
};

export type JobAddCronPayload = {
  job?: Maybe<Job>;
};

export type JobAddEveryInput = {
  queueId: Scalars['ID'];
  jobName: Scalars['ID'];
  data?: Maybe<Scalars['JSONObject']>;
  options?: Maybe<JobOptionsInput>;
};

export type JobAddEveryPayload = {
  job: Job;
};

export type JobAddInput = {
  queueId: Scalars['ID'];
  jobName: Scalars['String'];
  data?: Maybe<Scalars['JSONObject']>;
  options?: Maybe<JobOptionsInput>;
};

/** The count of jobs according to status */
export type JobCounts = {
  completed?: Maybe<Scalars['Int']>;
  failed?: Maybe<Scalars['Int']>;
  delayed?: Maybe<Scalars['Int']>;
  active?: Maybe<Scalars['Int']>;
  waiting?: Maybe<Scalars['Int']>;
  paused?: Maybe<Scalars['Int']>;
};

export type JobDataValidateInput = {
  queueId: Scalars['ID'];
  jobName: Scalars['String'];
  data?: Maybe<Scalars['JSONObject']>;
  opts?: Maybe<JobOptionsInput>;
};

export type JobDataValidatePayload = {
  queueId: Scalars['ID'];
  jobName: Scalars['String'];
};

export type JobDependenciesCountInput = {
  processed?: Maybe<Scalars['Boolean']>;
  unprocessed?: Maybe<Scalars['Boolean']>;
};

export type JobDependenciesCountPayload = {
  processed?: Maybe<Scalars['Int']>;
  unprocessed?: Maybe<Scalars['Int']>;
};

export type JobDependenciesOptsInput = {
  processed?: Maybe<JobDependencyCursorInput>;
  unprocessed?: Maybe<JobDependencyCursorInput>;
};

export type JobDependenciesPayload = {
  processed?: Maybe<Scalars['JSONObject']>;
  unprocessed?: Maybe<Array<Scalars['String']>>;
  nextProcessedCursor?: Maybe<Scalars['Int']>;
  nextUnprocessedCursor?: Maybe<Scalars['Int']>;
};

export type JobDependencyCursorInput = {
  cursor?: Maybe<Scalars['Int']>;
  count?: Maybe<Scalars['Int']>;
};

/** Marks a job to not be retried if it fails (even if attempts has been configured) */
export type JobDiscardPayload = {
  job: Job;
};

/** Options for filtering queue jobs */
export type JobFilter = {
  id: Scalars['ID'];
  /** A descriptive name of the filter */
  name: Scalars['String'];
  /** Optional job status to filter jobs by */
  status?: Maybe<JobStatus>;
  /** The job filter query */
  expression: Scalars['String'];
  /** The date this filter was created */
  createdAt?: Maybe<Scalars['Date']>;
};

export type JobFilterInput = {
  queueId: Scalars['ID'];
  name: Scalars['String'];
  status?: Maybe<JobStatus>;
  expression: Scalars['String'];
};

export type JobFilterUpdateInput = {
  queueId: Scalars['ID'];
  filterId: Scalars['ID'];
  name?: Maybe<Scalars['String']>;
  status?: Maybe<JobStatus>;
  expression: Scalars['String'];
};

export type JobFilterUpdatePayload = {
  filter?: Maybe<JobFilter>;
  isUpdated: Scalars['Boolean'];
};

export type JobLocatorInput = {
  queueId: Scalars['ID'];
  jobId: Scalars['ID'];
};

export type JobLogAddPayload = {
  /** The job id */
  id: Scalars['String'];
  /** The number of log entries after adding */
  count: Scalars['Int'];
  state?: Maybe<JobStatus>;
};

export type JobLogs = {
  count: Scalars['Int'];
  items: Array<Scalars['String']>;
};

export type JobMemoryUsagePayload = {
  /** The total number of bytes consumed by the sampled jobs */
  byteCount: Scalars['Int'];
  /** The total number of jobs contributing to the byteCount */
  jobCount: Scalars['Int'];
};

export type JobMoveToCompletedPayload = {
  queue: Queue;
  job?: Maybe<Job>;
};

export type JobMoveToDelayedInput = {
  queueId: Scalars['ID'];
  jobId: Scalars['String'];
  /** The amount of time to delay execution (in ms) */
  delay?: Maybe<Scalars['Duration']>;
};

export type JobMoveToDelayedPayload = {
  job: Job;
  delay: Scalars['Int'];
  /** Estimated date/time of execution */
  executeAt: Scalars['Date'];
};

export type JobMoveToFailedInput = {
  queueId: Scalars['String'];
  jobId: Scalars['String'];
  failedReason?: Maybe<Scalars['String']>;
};

export type JobMoveToFailedPayload = {
  job: Job;
  queue: Queue;
};

export type JobOptions = {
  timestamp?: Maybe<Scalars['Date']>;
  /** Ranges from 1 (highest priority) to MAX_INT  (lowest priority). Note that using priorities has a slight impact on performance, so do not use it if not required. */
  priority?: Maybe<Scalars['Int']>;
  /**
   * An amount of milliseconds to wait until this job can be processed.
   * Note that for accurate delays, worker and producers should have their clocks synchronized.
   */
  delay?: Maybe<Scalars['Int']>;
  /** The total number of attempts to try the job until it completes. */
  attempts?: Maybe<Scalars['Int']>;
  /** Backoff setting for automatic retries if the job fails */
  backoff?: Maybe<Scalars['JSON']>;
  /** if true, adds the job to the right of the queue instead of the left (default false) */
  lifo?: Maybe<Scalars['Boolean']>;
  /** The number of milliseconds after which the job should be fail with a timeout error [optional] */
  timeout?: Maybe<Scalars['Int']>;
  /** Override the job ID - by default, the job ID is a unique integer, but you can use this setting to override it. If you use this option, it is up to you to ensure the jobId is unique. If you attempt to add a job with an id that already exists, it will not be added. */
  jobId?: Maybe<Scalars['String']>;
  /** If true, removes the job when it successfully completes.  A number specify the max amount of jobs to keep.  Default behavior is to keep the job in the COMPLETED set. */
  removeOnComplete?: Maybe<Scalars['JobRemoveOption']>;
  /** If true, removes the job when it fails after all attempts.  A number specify the max amount of jobs to keep.  Default behavior is to keep the job in the FAILED set. */
  removeOnFail?: Maybe<Scalars['JobRemoveOption']>;
  /** Limits the amount of stack trace lines that will be recorded in the stacktrace. */
  stackTraceLimit?: Maybe<Scalars['Int']>;
  /** Job repeat options */
  repeat?: Maybe<JobRepeatOptions>;
};

export type JobOptionsInput = {
  timestamp?: Maybe<Scalars['Date']>;
  /** Ranges from 1 (highest priority) to MAX_INT  (lowest priority). Note that using priorities has a slight impact on performance, so do not use it if not required. */
  priority?: Maybe<Scalars['Int']>;
  /**
   * An amount of milliseconds to wait until this job can be processed.
   * Note that for accurate delays, worker and producers should have their clocks synchronized.
   */
  delay?: Maybe<Scalars['Int']>;
  /** The total number of attempts to try the job until it completes. */
  attempts?: Maybe<Scalars['Int']>;
  /** Backoff setting for automatic retries if the job fails */
  backoff?: Maybe<Scalars['JSON']>;
  /** if true, adds the job to the right of the queue instead of the left (default false) */
  lifo?: Maybe<Scalars['Boolean']>;
  /** The number of milliseconds after which the job should be fail with a timeout error [optional] */
  timeout?: Maybe<Scalars['Int']>;
  /** Override the job ID - by default, the job ID is a unique integer, but you can use this setting to override it. If you use this option, it is up to you to ensure the jobId is unique. If you attempt to add a job with an id that already exists, it will not be added. */
  jobId?: Maybe<Scalars['String']>;
  /** If true, removes the job when it successfully completes.  A number specify the max amount of jobs to keep.  Default behavior is to keep the job in the COMPLETED set. */
  removeOnComplete?: Maybe<Scalars['JobRemoveOption']>;
  /** If true, removes the job when it fails after all attempts.  A number specify the max amount of jobs to keep.  Default behavior is to keep the job in the FAILED set. */
  removeOnFail?: Maybe<Scalars['JobRemoveOption']>;
  /** Limits the amount of stack trace lines that will be recorded in the stacktrace. */
  stackTraceLimit?: Maybe<Scalars['Int']>;
  repeat?: Maybe<JobRepeatOptionsCronInput>;
};


export type JobPromotePayload = {
  job: Job;
  queue: Queue;
};


export type JobRemovePayload = {
  queue: Queue;
  job: Job;
};

export type JobRepeatOptions = {
  tz?: Maybe<Scalars['String']>;
  endDate?: Maybe<Scalars['Date']>;
  limit?: Maybe<Scalars['Int']>;
  count?: Maybe<Scalars['Int']>;
  prevMillis?: Maybe<Scalars['Int']>;
  jobId?: Maybe<Scalars['String']>;
  startDate?: Maybe<Scalars['Date']>;
  cron?: Maybe<Scalars['String']>;
  every?: Maybe<Scalars['String']>;
};

export type JobRepeatOptionsCronInput = {
  tz?: Maybe<Scalars['String']>;
  endDate?: Maybe<Scalars['Date']>;
  limit?: Maybe<Scalars['Int']>;
  count?: Maybe<Scalars['Int']>;
  prevMillis?: Maybe<Scalars['Int']>;
  jobId?: Maybe<Scalars['String']>;
  startDate?: Maybe<Scalars['Date']>;
  cron: Scalars['String'];
};

export type JobRetryPayload = {
  job: Job;
  queue: Queue;
};

/** Options for validating job data */
export type JobSchema = {
  jobName: Scalars['String'];
  /** The JSON schema associated with the job name */
  schema?: Maybe<Scalars['JSONSchema']>;
  /** Default options for jobs off this type created through the API */
  defaultOpts?: Maybe<Scalars['JSONObject']>;
};

export type JobSchemaInferInput = {
  queueId: Scalars['ID'];
  jobName?: Maybe<Scalars['String']>;
};

export type JobSchemaInput = {
  queueId: Scalars['ID'];
  jobName: Scalars['String'];
  schema: Scalars['JSONSchema'];
  defaultOpts?: Maybe<JobOptionsInput>;
};

export type JobSearchInput = {
  /** Search for jobs having this status */
  status?: Maybe<JobStatus>;
  /** The job filter expression */
  criteria?: Maybe<Scalars['String']>;
  /** The iterator cursor. Iteration starts when the cursor is set to null, and terminates when the cursor returned by the server is null */
  cursor?: Maybe<Scalars['String']>;
  /** The maximum number of jobs to return per iteration */
  count?: Scalars['Int'];
};

export type JobSearchPayload = {
  cursor?: Maybe<Scalars['String']>;
  hasNext: Scalars['Boolean'];
  jobs: Array<Job>;
  total: Scalars['Int'];
  current: Scalars['Int'];
};

/** Base implementation for job stats information. */
export type JobStatsInterface = {
  /** The sample size */
  count: Scalars['Int'];
  /** The number of failed jobs in the sample interval */
  failed: Scalars['Int'];
  /** The number of completed jobs in the sample interval */
  completed: Scalars['Int'];
  /** The start of the interval */
  startTime: Scalars['Date'];
  /** The end of the interval */
  endTime: Scalars['Date'];
};

export enum JobStatus {
  Completed = 'COMPLETED',
  Waiting = 'WAITING',
  Active = 'ACTIVE',
  Delayed = 'DELAYED',
  Failed = 'FAILED',
  Paused = 'PAUSED',
  WaitingChildren = 'WAITING_CHILDREN',
  Unknown = 'UNKNOWN'
}

export type JobUpdateDelta = {
  id: Scalars['String'];
  delta: Scalars['JSONObject'];
};

export type JobUpdateInput = {
  queueId: Scalars['String'];
  jobId: Scalars['String'];
  data: Scalars['JSONObject'];
};

export type JobUpdatePayload = {
  job: Job;
};

export type JobsByFilterIdInput = {
  /** The id of the filter */
  filterId: Scalars['ID'];
  /** The iterator cursor. Iteration starts when the cursor is set to 0, and terminates when the cursor returned by the server is 0 */
  cursor?: Maybe<Scalars['Int']>;
  /** The maximum number of jobs to return per iteration */
  count: Scalars['Int'];
};

export type JobsMemoryAvgInput = {
  /** Job status to consider. Defaults to COMPLETED */
  status?: Maybe<JobStatus>;
  /** Consider only jobs of this type (optional) */
  jobName?: Maybe<Scalars['String']>;
  /** An optional upper limit of jobs to sample for the average */
  limit?: Maybe<Scalars['Int']>;
};

/** A channel which sends notifications through email */
export type MailNotificationChannel = NotificationChannel & {
  id: Scalars['ID'];
  /** The type of the channel, e.g. slack, email, webhook etc */
  type: Scalars['String'];
  /** The name of the channel */
  name: Scalars['String'];
  /** Is the channel enabled ? */
  enabled: Scalars['Boolean'];
  /** Timestamp of channel creation */
  createdAt?: Maybe<Scalars['Date']>;
  /** Timestamp of last channel update */
  updatedAt?: Maybe<Scalars['Date']>;
  /** Emails of notification recipients */
  recipients: Array<Maybe<Scalars['EmailAddress']>>;
};

export type MailNotificationChannelAddInput = {
  hostId: Scalars['ID'];
  channel: MailNotificationChannelUpdate;
};

export type MailNotificationChannelUpdate = {
  /** The type of the channel, e.g. slack, email, webhook etc */
  type: Scalars['String'];
  /** The name of the channel */
  name: Scalars['String'];
  /** Is the channel enabled ? */
  enabled: Scalars['Boolean'];
  /** Emails of notification recipients */
  recipients: Array<Maybe<Scalars['EmailAddress']>>;
};

export type MailNotificationChannelUpdateInput = {
  hostId: Scalars['ID'];
  channel: MailNotificationChannelUpdate;
};

/** Records the rate of events over an interval using an exponentially moving average */
export type Meter = {
  /** The number of samples. */
  count: Scalars['Int'];
  /** The average rate since the meter was started. */
  meanRate: Scalars['Float'];
  /** The 1 minute average */
  m1Rate: Scalars['Float'];
  /** The 5 minute average */
  m5Rate: Scalars['Float'];
  /** The 15 minute average */
  m15Rate: Scalars['Float'];
};

/** Metrics are numeric samples of data collected over time */
export type Metric = {
  /** the id of the metric */
  id: Scalars['ID'];
  type: MetricType;
  /** The id of the queue to which the metric belongs */
  queueId: Scalars['ID'];
  /** The name of the metric */
  name: Scalars['String'];
  /** A description of the metric being measured. */
  description?: Maybe<Scalars['String']>;
  /** The metric sampling interval. */
  sampleInterval?: Maybe<Scalars['Int']>;
  /** Is the metric active (i.e. is data being collected). */
  isActive: Scalars['Boolean'];
  /** The metric options */
  options: Scalars['JSONObject'];
  /** Timestamp of when this metric was created */
  createdAt: Scalars['Date'];
  /** Timestamp of when this metric was created */
  updatedAt: Scalars['Date'];
  aggregator: Aggregator;
  data: Array<Maybe<TimeseriesDataPoint>>;
  /** Uses a rolling mean and a rolling deviation (separate) to identify peaks in metric data */
  outliers: Array<Maybe<PeakDataPoint>>;
  histogram: HistogramPayload;
  /** Uses a rolling mean and a rolling deviation (separate) to identify peaks in metric data */
  summaryStats: SummaryStatistics;
  /** Returns the timestamps of the first and last data items recorded for the metric */
  dateRange?: Maybe<TimeSpan>;
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
export type MetricHistogramArgs = {
  input: MetricsHistogramInput;
};


/** Metrics are numeric samples of data collected over time */
export type MetricSummaryStatsArgs = {
  input: MetricDataInput;
};

export enum MetricCategory {
  Queue = 'Queue',
  Host = 'Host',
  Redis = 'Redis'
}

/** Input fields for creating a metric */
export type MetricCreateInput = {
  type: MetricType;
  /** The id of the queue to which the metric belongs */
  queueId: Scalars['ID'];
  /** The name of the metric */
  name: Scalars['String'];
  /** A description of the metric being measured. */
  description?: Maybe<Scalars['String']>;
  /** The metric sampling interval. */
  sampleInterval?: Maybe<Scalars['Int']>;
  /** Is the metric active (i.e. is data being collected). */
  isActive: Scalars['Boolean'];
  /** The metric options */
  options: Scalars['JSONObject'];
  aggregator?: Maybe<AggregatorInput>;
};

export type MetricDataInput = {
  start: Scalars['Date'];
  end: Scalars['Date'];
};

export type MetricDataOutliersInput = {
  start: Scalars['Date'];
  end: Scalars['Date'];
  /** The lag time (in ms) of the moving window how much your data will be smoothed */
  lag?: Maybe<Scalars['Duration']>;
  /** The z-score at which the algorithm signals (i.e. how many standard deviations away from the moving mean a peak (or signal) is) */
  threshold?: Maybe<Scalars['Float']>;
  /** The influence (between 0 and 1) of new signals on the mean and standard deviation (how much a peak (or signal) should affect other values near it) */
  influence?: Maybe<Scalars['Float']>;
};

export type MetricDataRefreshInput = {
  metricId: Scalars['String'];
  start?: Maybe<Scalars['Date']>;
  end?: Maybe<Scalars['Date']>;
  /** An expression specifying the range to query e.g. yesterday, last_7days */
  range?: Maybe<Scalars['String']>;
};

export type MetricDataRefreshPayload = {
  metricId: Scalars['String'];
  metric: Metric;
  start?: Maybe<Scalars['Date']>;
  end?: Maybe<Scalars['Date']>;
};

export type MetricDeleteInput = {
  queueId: Scalars['ID'];
  metricId: Scalars['ID'];
};

export type MetricDeletePayload = {
  queue: Queue;
  isDeleted: Scalars['Boolean'];
};

export type MetricInfo = {
  key: Scalars['String'];
  description?: Maybe<Scalars['String']>;
  category?: Maybe<MetricCategory>;
  type: MetricType;
  valueType: MetricValueType;
  unit?: Maybe<Scalars['String']>;
  isPolling: Scalars['Boolean'];
};

/** Input fields for updating a metric */
export type MetricInput = {
  /** the id of the metric */
  id: Scalars['ID'];
  type: MetricType;
  /** The id of the queue to which the metric belongs */
  queueId: Scalars['ID'];
  /** The name of the metric */
  name?: Maybe<Scalars['String']>;
  /** A description of the metric being measured. */
  description?: Maybe<Scalars['String']>;
  /** The metric sampling interval. */
  sampleInterval?: Maybe<Scalars['Int']>;
  /** Is the metric active (i.e. is data being collected). */
  isActive: Scalars['Boolean'];
  /** The metric options */
  options?: Maybe<Scalars['JSONObject']>;
  aggregator?: Maybe<AggregatorInput>;
};

export enum MetricType {
  None = 'None',
  Apdex = 'Apdex',
  ActiveJobs = 'ActiveJobs',
  ConnectedClients = 'ConnectedClients',
  ConsecutiveFailures = 'ConsecutiveFailures',
  Completed = 'Completed',
  CompletedRate = 'CompletedRate',
  CurrentCompletedCount = 'CurrentCompletedCount',
  CurrentFailedCount = 'CurrentFailedCount',
  DelayedJobs = 'DelayedJobs',
  ErrorRate = 'ErrorRate',
  ErrorPercentage = 'ErrorPercentage',
  Failures = 'Failures',
  Finished = 'Finished',
  FragmentationRatio = 'FragmentationRatio',
  InstantaneousOps = 'InstantaneousOps',
  JobRate = 'JobRate',
  Latency = 'Latency',
  PeakMemory = 'PeakMemory',
  PendingCount = 'PendingCount',
  UsedMemory = 'UsedMemory',
  Waiting = 'Waiting',
  WaitingChildren = 'WaitingChildren',
  WaitTime = 'WaitTime'
}

export enum MetricValueType {
  Count = 'Count',
  Gauge = 'Gauge',
  Rate = 'Rate'
}

/** Compute a frequency distribution of a range of metric data. */
export type MetricsHistogramInput = {
  /** The minimum date to consider */
  from: Scalars['DateTime'];
  /** The maximum date to consider */
  to: Scalars['DateTime'];
  options?: Maybe<HistogramBinOptionsInput>;
};

export type Mutation = {
  metricDataRefresh: Array<Maybe<MetricDataRefreshPayload>>;
  /** Create a queue metric */
  metricCreate: Metric;
  /** Update a job metric */
  metricUpdate: Metric;
  /** Delete a queue metric */
  metricDelete: MetricDeletePayload;
  /** Add a mail notification channel */
  mailNotificationChannelAdd: MailNotificationChannel;
  /** Add a slack notification channel */
  slackNotificationChannelAdd: SlackNotificationChannel;
  /** Add a webhook notification channel */
  webhookNotificationChannelAdd: WebhookNotificationChannel;
  notificationChannelEnable: NotificationChannelEnablePayload;
  notificationChannelDisable: NotificationChannelDisablePayload;
  notificationChannelDelete: NotificationChannelDeletePayload;
  mailNotificationChannelUpdate: MailNotificationChannel;
  slackNotificationChannelUpdate: SlackNotificationChannel;
  webhookNotificationChannelUpdate: WebhookNotificationChannel;
  jobAdd: Job;
  jobAddBulk?: Maybe<JobAddBulkPayload>;
  jobAddCron: JobAddCronPayload;
  jobAddEvery: JobAddEveryPayload;
  jobDiscard: JobDiscardPayload;
  jobPromote: JobPromotePayload;
  jobRemove: JobRemovePayload;
  /** Bulk deletes a list of jobs by id */
  jobRemoveBulk?: Maybe<BulkJobActionPayload>;
  jobRetry: JobRetryPayload;
  jobUpdate: JobUpdatePayload;
  jobLogAdd: JobLogAddPayload;
  jobMoveToCompleted: JobMoveToCompletedPayload;
  /** Moves job from active to delayed. */
  jobMoveToDelayed: JobMoveToDelayedPayload;
  jobMoveToFailed: JobMoveToFailedPayload;
  /** Bulk promotes a list of jobs by id */
  jobPromoteBulk?: Maybe<BulkJobActionPayload>;
  /** Bulk retries a list of jobs by id */
  jobRetryBulk?: Maybe<BulkJobActionPayload>;
  repeatableJobRemoveByKey: RepeatableJobRemoveByKeyPayload;
  repeatableJobRemove: QueueRemoveRepeatablePayload;
  /** Remove all jobs created outside of a grace interval in milliseconds. You can clean the jobs with the following states: COMPLETED, wait (typo for WAITING), isActive, DELAYED, and FAILED. */
  queueClean: QueueCleanPayload;
  /** Drains the queue, i.e., removes all jobs that are waiting or delayed, but not active, completed or failed. */
  queueDrain: QueueDrainPayload;
  /**
   * Pause the queue.
   *
   * A PAUSED queue will not process new jobs until resumed, but current jobs being processed will continue until they are finalized.
   */
  queuePause: Queue;
  /** Resume a queue after being PAUSED. */
  queueResume: Queue;
  queueDelete: QueueDeletePayload;
  /** Start tracking a queue */
  queueRegister: Queue;
  /** Stop tracking a queue */
  queueUnregister: QueueUnregisterPayload;
  /** Add a named job filter */
  queueJobFilterCreate: JobFilter;
  /** Associate a JSON schema with a job name on a queue */
  queueJobSchemaSet: JobSchema;
  /** Delete a schema associated with a job name on a queue */
  queueJobSchemaDelete: QueueJobSchemaDeletePayload;
  /** Delete a job filter */
  queueJobFilterDelete: QueueJobFilterDeletePayload;
  /** Update a job filter */
  queueJobFilterUpdate: JobFilterUpdatePayload;
  /** Delete all stats associated with a queue */
  queueStatsDelete: QueueStatsDeletePayload;
  /** Delete a rule alert */
  ruleAlertDelete: RuleAlertDeletePayload;
  /** Removes all alerts associated with a rule */
  ruleAlertsClear: RuleAlertsClearPayload;
  /** Delete a rule */
  ruleDelete: RuleDeletePayload;
  /** Create a rule for a queue */
  ruleAdd: Rule;
  /** Removes all alerts associated with a rule */
  ruleActivate: RuleActivatePayload;
  /** Removes all alerts associated with a rule */
  ruleDeactivate: RuleDeactivatePayload;
  /** Update a rule */
  ruleUpdate: Rule;
  /** Delete a rule alert */
  ruleAlertMarkAsRead: RuleAlertMarkAsReadPayload;
};


export type MutationMetricDataRefreshArgs = {
  input: MetricDataRefreshInput;
};


export type MutationMetricCreateArgs = {
  input: MetricCreateInput;
};


export type MutationMetricUpdateArgs = {
  input: MetricInput;
};


export type MutationMetricDeleteArgs = {
  input: MetricDeleteInput;
};


export type MutationMailNotificationChannelAddArgs = {
  input: MailNotificationChannelAddInput;
};


export type MutationSlackNotificationChannelAddArgs = {
  input: SlackNotificationChannelAddInput;
};


export type MutationWebhookNotificationChannelAddArgs = {
  input: WebhookNotificationChannelAddInput;
};


export type MutationNotificationChannelEnableArgs = {
  hostId: Scalars['ID'];
  channelId: Scalars['ID'];
};


export type MutationNotificationChannelDisableArgs = {
  hostId: Scalars['ID'];
  channelId: Scalars['ID'];
};


export type MutationNotificationChannelDeleteArgs = {
  hostId: Scalars['ID'];
  channelId: Scalars['ID'];
};


export type MutationMailNotificationChannelUpdateArgs = {
  input: MailNotificationChannelUpdateInput;
};


export type MutationSlackNotificationChannelUpdateArgs = {
  input: SlackNotificationChannelUpdateInput;
};


export type MutationWebhookNotificationChannelUpdateArgs = {
  input: WebhookNotificationChannelUpdateInput;
};


export type MutationJobAddArgs = {
  input?: Maybe<JobAddInput>;
};


export type MutationJobAddBulkArgs = {
  queueId: Scalars['String'];
  jobs: Array<Maybe<BulkJobItemInput>>;
};


export type MutationJobAddCronArgs = {
  input: JobAddCronInput;
};


export type MutationJobAddEveryArgs = {
  input?: Maybe<JobAddEveryInput>;
};


export type MutationJobDiscardArgs = {
  input: JobLocatorInput;
};


export type MutationJobPromoteArgs = {
  input: JobLocatorInput;
};


export type MutationJobRemoveArgs = {
  input: JobLocatorInput;
};


export type MutationJobRemoveBulkArgs = {
  input: BulkJobActionInput;
};


export type MutationJobRetryArgs = {
  input: JobLocatorInput;
};


export type MutationJobUpdateArgs = {
  input: JobUpdateInput;
};


export type MutationJobLogAddArgs = {
  queueId: Scalars['String'];
  id: Scalars['String'];
  row: Scalars['String'];
};


export type MutationJobMoveToCompletedArgs = {
  input: JobLocatorInput;
};


export type MutationJobMoveToDelayedArgs = {
  input?: Maybe<JobMoveToDelayedInput>;
};


export type MutationJobMoveToFailedArgs = {
  input?: Maybe<JobMoveToFailedInput>;
};


export type MutationJobPromoteBulkArgs = {
  input: BulkJobActionInput;
};


export type MutationJobRetryBulkArgs = {
  input: BulkJobActionInput;
};


export type MutationRepeatableJobRemoveByKeyArgs = {
  input: RepeatableJobRemoveByKeyInput;
};


export type MutationRepeatableJobRemoveArgs = {
  id: Scalars['ID'];
  jobName?: Maybe<Scalars['String']>;
  repeat: RepeatableJobRemoveOptions;
};


export type MutationQueueCleanArgs = {
  input: QueueCleanFilter;
};


export type MutationQueueDrainArgs = {
  id: Scalars['ID'];
  delayed?: Maybe<Scalars['Boolean']>;
};


export type MutationQueuePauseArgs = {
  id: Scalars['ID'];
};


export type MutationQueueResumeArgs = {
  id: Scalars['ID'];
};


export type MutationQueueDeleteArgs = {
  id: Scalars['ID'];
  options?: Maybe<QueueDeleteOptions>;
};


export type MutationQueueRegisterArgs = {
  input?: Maybe<RegisterQueueInput>;
};


export type MutationQueueUnregisterArgs = {
  id: Scalars['ID'];
};


export type MutationQueueJobFilterCreateArgs = {
  input: JobFilterInput;
};


export type MutationQueueJobSchemaSetArgs = {
  input: JobSchemaInput;
};


export type MutationQueueJobSchemaDeleteArgs = {
  input: QueueJobSchemaDeleteInput;
};


export type MutationQueueJobFilterDeleteArgs = {
  input: QueueJobFilterDeleteInput;
};


export type MutationQueueJobFilterUpdateArgs = {
  input: JobFilterUpdateInput;
};


export type MutationQueueStatsDeleteArgs = {
  input: QueueStatsDeleteInput;
};


export type MutationRuleAlertDeleteArgs = {
  input: RuleAlertDeleteInput;
};


export type MutationRuleAlertsClearArgs = {
  input: RuleAlertsClearInput;
};


export type MutationRuleDeleteArgs = {
  input: RuleDeleteInput;
};


export type MutationRuleAddArgs = {
  input: RuleAddInput;
};


export type MutationRuleActivateArgs = {
  input: RuleActivateInput;
};


export type MutationRuleDeactivateArgs = {
  input: RuleDeactivateInput;
};


export type MutationRuleUpdateArgs = {
  input: RuleUpdateInput;
};


export type MutationRuleAlertMarkAsReadArgs = {
  input: RuleAlertMarkAsReadInput;
};

/** NotificationChannels provide a consistent ways for users to be notified about incidents. */
export type NotificationChannel = {
  id: Scalars['ID'];
  /** The type of the channel, e.g. slack, email, webhook etc */
  type: Scalars['String'];
  /** The name of the channel */
  name: Scalars['String'];
  /** Is the channel enabled ? */
  enabled: Scalars['Boolean'];
  /** Timestamp of channel creation */
  createdAt?: Maybe<Scalars['Date']>;
  /** Timestamp of last channel update */
  updatedAt?: Maybe<Scalars['Date']>;
};

export type NotificationChannelDeletePayload = {
  hostId: Scalars['ID'];
  channelId: Scalars['ID'];
  deleted: Scalars['Boolean'];
};

export type NotificationChannelDisablePayload = {
  updated: Scalars['Boolean'];
};

export type NotificationChannelEnablePayload = {
  updated: Scalars['Boolean'];
};

export type OnJobAddedPayload = {
  jobId: Scalars['String'];
  jobName: Scalars['String'];
  queueId: Scalars['String'];
  queueName: Scalars['String'];
};

export type OnJobDelayedPayload = {
  job?: Maybe<Job>;
  queue: Queue;
  jobId: Scalars['String'];
  delay?: Maybe<Scalars['Int']>;
};

export type OnJobLogAddedPayload = {
  job: Job;
  queueId: Scalars['String'];
  jobId: Scalars['String'];
  /** The rows added to the job log */
  rows: Array<Scalars['String']>;
  /** The number of log lines after addition */
  count: Scalars['Int'];
};

export type OnJobProgressPayload = {
  job: Job;
  queue: Queue;
  progress?: Maybe<Scalars['JobProgress']>;
};

export type OnJobRemovedPayload = {
  queue: Queue;
  jobId: Scalars['String'];
};

export type OnJobStateChangePayload = {
  job: Job;
  queue: Queue;
};

/** Holds the changes to the state of a job */
export type OnJobUpdatedPayload = {
  /** The event which triggered the update */
  event: Scalars['String'];
  timestamp: Scalars['Date'];
  /** updates in job state since the last event */
  delta?: Maybe<Scalars['JSONObject']>;
  job?: Maybe<Job>;
  /** The job's queue */
  queue: Queue;
};

export type OnNotificationChannelCreatedPayload = {
  hostId: Scalars['String'];
  channelId: Scalars['String'];
  channelName: Scalars['String'];
  channelType: Scalars['String'];
};

export type OnNotificationChannelDeletedPayload = {
  hostId: Scalars['String'];
  channelId: Scalars['String'];
  channelName: Scalars['String'];
  channelType: Scalars['String'];
};

export type OnQueueDeletedPayload = {
  /** The id of the deleted queue */
  queueId: Scalars['String'];
  /** The name of the deleted queue */
  queueName: Scalars['String'];
  /** The queue host id */
  hostId: Scalars['String'];
  /** The number of keys deleted */
  deletedKeys: Scalars['Int'];
};

export type OnQueueJobCountsChangedPayload = {
  queueId: Scalars['String'];
  delta?: Maybe<QueueJobCountDelta>;
};

export type OnQueueJobUpdatesPayload = {
  queueId: Scalars['String'];
  changes: Array<JobUpdateDelta>;
};

/** Returns a stream of metric data updates */
export type OnQueueMetricValueUpdated = {
  queueId: Scalars['String'];
  value: Scalars['Float'];
  /** The timestamp of the time the value was recorded */
  ts: Scalars['Date'];
};

export type OnQueuePausedPayload = {
  queueId: Scalars['String'];
};

export type OnQueueRegisteredPayload = {
  hostId: Scalars['String'];
  queueId: Scalars['String'];
  queueName: Scalars['String'];
  prefix: Scalars['String'];
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
  queueName: Scalars['String'];
  queueId: Scalars['String'];
  prefix: Scalars['String'];
};

/** Returns the list of added and removed workers related to a queue */
export type OnQueueWorkersChangedPayload = {
  queueId: Scalars['String'];
  added: Array<QueueWorker>;
  removed: Array<QueueWorker>;
};

export type OnQueueWorkersCountPayload = {
  queueId: Scalars['String'];
  workersCount: Scalars['Int'];
};

export type OnRuleAlertPayload = {
  alert: RuleAlert;
};

export type PeakConditionInput = {
  /** Standard deviations at which to trigger an error notification. */
  errorThreshold: Scalars['Float'];
  /** Standard deviations at which to trigger an warning notification. */
  warningThreshold?: Maybe<Scalars['Float']>;
  /** The comparison operator */
  operator: RuleOperator;
  /** Signal if peak is above the threshold, below the threshold or either */
  direction: PeakSignalDirection;
  /** the influence (between 0 and 1) of new signals on the mean and standard deviation where 1 is normal influence, 0.5 is half */
  influence?: Maybe<Scalars['Float']>;
  /** The lag of the moving window (in milliseconds).  For example, a lag of 5000 will use the last 5 seconds of observationsto smooth the data. */
  lag?: Maybe<Scalars['Duration']>;
};

export type PeakDataPoint = TimeseriesDataPointInterface & {
  /** The timestamp of when the event occurred */
  ts: Scalars['Timestamp'];
  /** The value at the given timestamp */
  value: Scalars['Float'];
  signal: PeakSignalDirection;
};

export enum PeakSignalDirection {
  Above = 'ABOVE',
  Below = 'BELOW',
  Both = 'BOTH'
}

export type PercentileCount = {
  count: Scalars['Int'];
  /** The percentile value */
  value: Scalars['Float'];
};

/** Percentile distribution of metric values */
export type PercentileDistribution = {
  /** The total number of values. */
  totalCount: Scalars['Int'];
  /** The minimum value in the data range. */
  min: Scalars['Float'];
  /** The maximum value in the data range. */
  max: Scalars['Float'];
  percentiles: Array<Maybe<PercentileCount>>;
};

/** Records histogram binning data */
export type PercentileDistributionInput = {
  /** An optional job name to filter on */
  jobName?: Maybe<Scalars['String']>;
  /** The metric requested */
  metric?: Maybe<StatsMetricType>;
  /** Stats snapshot granularity */
  granularity: StatsGranularity;
  /** An expression specifying the range to query e.g. yesterday, last_7days */
  range: Scalars['String'];
  /** The percentiles to get frequencies for */
  percentiles?: Array<Scalars['Float']>;
};

export type PingPayload = {
  latency: Scalars['Int'];
};

export type Query = {
  /** Get the list of aggregate types available for metrics */
  aggregates: Array<Maybe<AggregateInfo>>;
  /** Get general app info */
  appInfo: AppInfo;
  /** Get a queue by id */
  queue?: Maybe<Queue>;
  job: Job;
  /** Validate job data against a schema previously defined on a queue */
  jobDataValidate: JobDataValidatePayload;
  /** Validate BullMQ job options structure */
  jobOptionsValidate: ValidateJobOptionsPayload;
  /** Find a queue by name */
  findQueue?: Maybe<Queue>;
  /** Get a Host by id */
  host?: Maybe<QueueHost>;
  /** Get the list of hosts managed by the server instance */
  hosts: Array<QueueHost>;
  /** Get a Host by name */
  hostByName?: Maybe<QueueHost>;
  /** Get a queue Metric by id */
  metric?: Maybe<Metric>;
  notificationChannel?: Maybe<NotificationChannel>;
  /** Get the list of available metric types */
  availableMetrics: Array<MetricInfo>;
  /** Get a queue JobFilter by id */
  queueJobFilter?: Maybe<JobFilter>;
  /** Returns the JSON Schema for the BullMq JobOptions type */
  jobOptionsSchema: Scalars['JSONSchema'];
  rule?: Maybe<Rule>;
  ruleAlert?: Maybe<RuleAlert>;
  /** Get a JSONSchema document previously set for a job name on a queue */
  queueJobSchema?: Maybe<JobSchema>;
  /** Returns the JSON Schema for the BullMq BulkJobOptions type */
  bulkJobOptionsSchema: Scalars['JSONSchema'];
  /** Infer a JSONSchema from completed jobs in a queue */
  jobSchemaInfer?: Maybe<JobSchema>;
};


export type QueryQueueArgs = {
  id: Scalars['ID'];
};


export type QueryJobArgs = {
  queueId: Scalars['ID'];
  id: Scalars['ID'];
};


export type QueryJobDataValidateArgs = {
  input: JobDataValidateInput;
};


export type QueryJobOptionsValidateArgs = {
  input: JobOptionsInput;
};


export type QueryFindQueueArgs = {
  hostName: Scalars['String'];
  prefix?: Maybe<Scalars['String']>;
  queueName: Scalars['String'];
};


export type QueryHostArgs = {
  id: Scalars['ID'];
};


export type QueryHostByNameArgs = {
  name: Scalars['String'];
};


export type QueryMetricArgs = {
  queueId: Scalars['ID'];
  metricId: Scalars['ID'];
};


export type QueryNotificationChannelArgs = {
  hostId: Scalars['ID'];
  id: Scalars['ID'];
};


export type QueryQueueJobFilterArgs = {
  input?: Maybe<QueueJobFilterInput>;
};


export type QueryRuleArgs = {
  queueId: Scalars['ID'];
  ruleId: Scalars['ID'];
};


export type QueryRuleAlertArgs = {
  queueId: Scalars['ID'];
  ruleId: Scalars['ID'];
  alertId: Scalars['ID'];
};


export type QueryQueueJobSchemaArgs = {
  input?: Maybe<QueueJobSchemaInput>;
};


export type QueryJobSchemaInferArgs = {
  input?: Maybe<JobSchemaInferInput>;
};

export type Queue = {
  id: Scalars['String'];
  prefix: Scalars['String'];
  name: Scalars['String'];
  /** Compute the histogram of job data. */
  histogram: HistogramPayload;
  host: Scalars['String'];
  hostId: Scalars['ID'];
  isPaused: Scalars['Boolean'];
  jobCounts: JobCounts;
  jobNames: Array<Scalars['String']>;
  jobFilters: Array<JobFilter>;
  /** Get JSONSchema documents and job defaults previously set for a job names on a queue */
  jobSchemas: Array<JobSchema>;
  /** Incrementally iterate over a list of jobs filtered by query criteria */
  jobSearch: JobSearchPayload;
  /** Fetch jobs based on a previously stored filter */
  jobsByFilter: JobSearchPayload;
  /** Get the average runtime duration of completed jobs in the queue */
  jobDurationAvg: Scalars['Int'];
  /** Get the average memory used by jobs in the queue */
  jobMemoryAvg: Scalars['Float'];
  /** Get the average memory used by jobs in the queue */
  jobMemoryUsage: JobMemoryUsagePayload;
  /** Gets the last recorded queue stats snapshot for a metric */
  lastStatsSnapshot?: Maybe<StatsSnapshot>;
  metrics: Array<Metric>;
  metricCount: Scalars['Int'];
  /** Returns the number of jobs waiting to be processed. */
  pendingJobCount: Scalars['Int'];
  /** Compute a percentile distribution. */
  percentileDistribution: PercentileDistribution;
  repeatableJobs: Array<RepeatableJob>;
  /** Returns the number of repeatable jobs */
  repeatableJobCount: Scalars['Int'];
  /** Returns the count of rule alerts associated with a Queue */
  ruleAlertCount: Scalars['Int'];
  /** Gets rule alerts associated with the queue */
  ruleAlerts: Array<RuleAlert>;
  jobs: Array<Job>;
  jobsById: Array<Job>;
  rules: Array<Rule>;
  /** Queries for queue stats snapshots within a range */
  stats: Array<StatsSnapshot>;
  /** Aggregates queue statistics within a range */
  statsAggregate?: Maybe<StatsSnapshot>;
  /** Gets the time range of recorded stats for a queue/host */
  statsDateRange?: Maybe<TimeSpan>;
  /** Gets the current job Throughput rates based on an exponential moving average */
  throughput: Meter;
  /** Gets the current job Errors rates based on an exponential moving average */
  errorRate: Meter;
  /** Gets the current job ErrorPercentage rates based on an exponential moving average */
  errorPercentageRate: Meter;
  /** Returns the number of jobs waiting to be processed. */
  waitingCount: Scalars['Int'];
  /** Returns the number of child jobs waiting to be processed. */
  waitingChildrenCount: Scalars['Int'];
  /** Get the average time a job spends in the queue before being processed */
  waitTimeAvg: Scalars['Int'];
  workers: Array<QueueWorker>;
  workerCount: Scalars['Int'];
};


export type QueueHistogramArgs = {
  input: HistogramInput;
};


export type QueueJobFiltersArgs = {
  ids?: Maybe<Array<Scalars['ID']>>;
};


export type QueueJobSchemasArgs = {
  jobNames?: Maybe<Array<Scalars['String']>>;
};


export type QueueJobSearchArgs = {
  filter: JobSearchInput;
};


export type QueueJobsByFilterArgs = {
  filter: JobsByFilterIdInput;
};


export type QueueJobDurationAvgArgs = {
  jobName?: Maybe<Scalars['String']>;
  limit?: Maybe<Scalars['Int']>;
};


export type QueueJobMemoryAvgArgs = {
  input?: Maybe<JobsMemoryAvgInput>;
};


export type QueueJobMemoryUsageArgs = {
  input?: Maybe<JobsMemoryAvgInput>;
};


export type QueueLastStatsSnapshotArgs = {
  input?: Maybe<StatsLatestInput>;
};


export type QueuePercentileDistributionArgs = {
  input: PercentileDistributionInput;
};


export type QueueRepeatableJobsArgs = {
  input?: Maybe<RepeatableJobsInput>;
};


export type QueueRuleAlertsArgs = {
  input?: Maybe<QueueRuleAlertsInput>;
};


export type QueueJobsArgs = {
  input?: Maybe<QueueJobsInput>;
};


export type QueueJobsByIdArgs = {
  input?: Maybe<QueueJobsByIdInput>;
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
  input?: Maybe<StatsRateQueryInput>;
};


export type QueueErrorRateArgs = {
  input?: Maybe<StatsRateQueryInput>;
};


export type QueueErrorPercentageRateArgs = {
  input?: Maybe<StatsRateQueryInput>;
};


export type QueueWaitTimeAvgArgs = {
  jobName?: Maybe<Scalars['String']>;
  limit?: Maybe<Scalars['Int']>;
};


export type QueueWorkersArgs = {
  limit?: Maybe<Scalars['Int']>;
};

export type QueueCleanFilter = {
  id: Scalars['ID'];
  /** Grace period interval (ms). Jobs older this this will be removed. */
  grace?: Maybe<Scalars['Duration']>;
  /** Status of the jobs to clean */
  status?: Maybe<JobStatus>;
  /** limit Maximum amount of jobs to clean per call. If not provided will clean all matching jobs. */
  limit?: Maybe<Scalars['Int']>;
};

export type QueueCleanPayload = {
  /** The queue id */
  id: Scalars['ID'];
  /** Returns the number of affected jobs */
  count: Scalars['Int'];
  /** Returns a list of cleared job ids */
  jobIds?: Maybe<Array<Scalars['ID']>>;
};

export type QueueDeleteOptions = {
  checkExistence?: Maybe<Scalars['Boolean']>;
  checkActivity?: Maybe<Scalars['Boolean']>;
};

export type QueueDeletePayload = {
  /** The id of the deleted queue */
  queueId: Scalars['ID'];
  /** The name of the deleted queue */
  queueName: Scalars['String'];
  /** The queue host */
  host: QueueHost;
  /** The number of keys deleted */
  deletedKeys: Scalars['Int'];
};

export type QueueDrainPayload = {
  queue: Queue;
};

export enum QueueFilterStatus {
  Active = 'Active',
  Inactive = 'Inactive',
  Paused = 'Paused',
  Running = 'Running'
}

export type QueueHost = {
  id: Scalars['ID'];
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
  /** Get job counts for a host */
  jobCounts: JobCounts;
  /** Gets the last recorded queue stats snapshot for a metric */
  lastStatsSnapshot?: Maybe<StatsSnapshot>;
  /** The name of the host */
  name: Scalars['String'];
  /** Compute a percentile distribution. */
  percentileDistribution: PercentileDistribution;
  ping: PingPayload;
  /** The queues registered for this host */
  queues: Array<Queue>;
  /** The count of queues registered for this host */
  queueCount: Scalars['Int'];
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
  prefix?: Maybe<Scalars['String']>;
  unregisteredOnly?: Maybe<Scalars['Boolean']>;
};


export type QueueHostErrorPercentageRateArgs = {
  input?: Maybe<StatsRateQueryInput>;
};


export type QueueHostErrorRateArgs = {
  input?: Maybe<StatsRateQueryInput>;
};


export type QueueHostHistogramArgs = {
  input: HistogramInput;
};


export type QueueHostLastStatsSnapshotArgs = {
  input?: Maybe<StatsLatestInput>;
};


export type QueueHostPercentileDistributionArgs = {
  input: PercentileDistributionInput;
};


export type QueueHostQueuesArgs = {
  filter?: Maybe<HostQueuesFilter>;
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
  input?: Maybe<StatsRateQueryInput>;
};


export type QueueHostWorkersArgs = {
  limit?: Maybe<Scalars['Int']>;
};

export type QueueJobCountDelta = {
  completed?: Maybe<Scalars['Int']>;
  failed?: Maybe<Scalars['Int']>;
  delayed?: Maybe<Scalars['Int']>;
  active?: Maybe<Scalars['Int']>;
  waiting: Scalars['Int'];
};

export type QueueJobFilterDeleteInput = {
  queueId: Scalars['ID'];
  filterId: Scalars['ID'];
};

export type QueueJobFilterDeletePayload = {
  filterId: Scalars['String'];
  queue: Queue;
  isDeleted: Scalars['Boolean'];
};

export type QueueJobFilterInput = {
  queueId: Scalars['ID'];
  fieldId: Scalars['ID'];
};

export type QueueJobSchemaDeleteInput = {
  queueId: Scalars['ID'];
  jobName: Scalars['String'];
};

export type QueueJobSchemaDeletePayload = {
  jobName: Scalars['String'];
  queue: Queue;
};

export type QueueJobSchemaInput = {
  queueId: Scalars['ID'];
  jobName: Scalars['String'];
};

export type QueueJobUpdatesFilterInput = {
  queueId: Scalars['ID'];
  /** The job names to filter for */
  names?: Maybe<Array<Scalars['String']>>;
  /** Only return updates for jobs with these states */
  states?: Maybe<Array<Maybe<JobStatus>>>;
};

export type QueueJobsByIdInput = {
  ids: Array<Scalars['ID']>;
};

export type QueueJobsInput = {
  offset?: Maybe<Scalars['Int']>;
  limit?: Maybe<Scalars['Int']>;
  status?: Maybe<JobStatus>;
  sortOrder?: Maybe<SortOrderEnum>;
};

export type QueueRemoveRepeatablePayload = {
  queue: Queue;
};

/** Options for retrieving queue rule alerts */
export type QueueRuleAlertsInput = {
  /** Consider alerts starting on or after this date */
  startDate?: Maybe<Scalars['Date']>;
  /** Consider alerts ending on or before this date */
  endDate?: Maybe<Scalars['Date']>;
  /** The sort order of the results. Alerts are sorted by creation date. */
  sortOrder?: Maybe<SortOrderEnum>;
  /** The maximum number of alerts to return */
  limit: Scalars['Int'];
};

export type QueueStatsDeleteInput = {
  queueId: Scalars['ID'];
  /** Optional job name to delete stats for. If omitted, all queue stats are erased */
  jobName?: Maybe<Scalars['String']>;
  /** Optional stats granularity. If omitted, the entire range of data is deleted */
  granularity?: Maybe<StatsGranularity>;
};

export type QueueStatsDeletePayload = {
  isDeleted: Scalars['Boolean'];
  queue: Queue;
};

export type QueueUnregisterPayload = {
  host: QueueHost;
  queue: Queue;
  isRemoved: Scalars['Boolean'];
};

export type QueueWorker = {
  id?: Maybe<Scalars['String']>;
  /** address of the client */
  addr: Scalars['String'];
  name?: Maybe<Scalars['String']>;
  /** total duration of the connection (in seconds) */
  age: Scalars['Int'];
  /** Idle time of the connection (in seconds) */
  idle: Scalars['Int'];
  /** Date/time when the connection started */
  started?: Maybe<Scalars['DateTime']>;
  /** the current database number */
  db: Scalars['Int'];
  role?: Maybe<Scalars['String']>;
  sub: Scalars['Int'];
  multi: Scalars['Int'];
  qbuf: Scalars['Int'];
  qbufFree: Scalars['Int'];
  obl: Scalars['Int'];
  oll: Scalars['Int'];
  omem: Scalars['Int'];
};

export type RedisInfo = {
  redis_version: Scalars['String'];
  tcp_port: Scalars['Int'];
  uptime_in_seconds: Scalars['Int'];
  uptime_in_days: Scalars['Int'];
  connected_clients: Scalars['Int'];
  blocked_clients: Scalars['Int'];
  total_system_memory: Scalars['Int'];
  used_memory: Scalars['Int'];
  used_memory_peak: Scalars['Int'];
  used_memory_lua: Scalars['Int'];
  used_cpu_sys: Scalars['Float'];
  maxmemory: Scalars['Int'];
  number_of_cached_scripts: Scalars['Int'];
  instantaneous_ops_per_sec: Scalars['Int'];
  mem_fragmentation_ratio?: Maybe<Scalars['Float']>;
  role: Scalars['String'];
  os: Scalars['String'];
};

export type RegisterQueueInput = {
  hostId: Scalars['ID'];
  prefix?: Maybe<Scalars['String']>;
  /** the queue names */
  name: Scalars['String'];
  checkExists?: Maybe<Scalars['Boolean']>;
  trackMetrics?: Maybe<Scalars['Boolean']>;
};

export type RepeatableJob = {
  key: Scalars['String'];
  name?: Maybe<Scalars['String']>;
  id?: Maybe<Scalars['String']>;
  /** Date when the repeat job should stop repeating (only with cron). */
  endDate?: Maybe<Scalars['Date']>;
  /** The timezone for the job */
  tz?: Maybe<Scalars['String']>;
  cron?: Maybe<Scalars['String']>;
  /** Human readable description of the cron expression */
  descr?: Maybe<Scalars['String']>;
  next?: Maybe<Scalars['Date']>;
};

export type RepeatableJobRemoveByKeyInput = {
  queueId: Scalars['ID'];
  key: Scalars['String'];
};

export type RepeatableJobRemoveByKeyPayload = {
  key: Scalars['String'];
  queue?: Maybe<Queue>;
};

export type RepeatableJobRemoveOptions = {
  tz?: Maybe<Scalars['String']>;
  endDate?: Maybe<Scalars['Date']>;
  cron?: Maybe<Scalars['String']>;
  every?: Maybe<Scalars['String']>;
};

export type RepeatableJobsInput = {
  offset?: Maybe<Scalars['Int']>;
  limit?: Maybe<Scalars['Int']>;
  order?: Maybe<SortOrderEnum>;
};

export type Rule = {
  /** The rule id */
  id: Scalars['ID'];
  /** The id of the queue to which the rule belongs */
  queueId: Scalars['ID'];
  /** The names of the rule */
  name: Scalars['String'];
  /** A helpful description of the rule */
  description?: Maybe<Scalars['String']>;
  severity?: Maybe<Severity>;
  /** Is this rule active or not */
  isActive: Scalars['Boolean'];
  /** Optional data passed on to alerts */
  payload?: Maybe<Scalars['JSONObject']>;
  /** Optional text for message when an alert is raised. Markdown and handlebars supported */
  message?: Maybe<Scalars['String']>;
  /** The rule creation timestamp */
  createdAt: Scalars['Date'];
  /** The timestamp of last update */
  updatedAt: Scalars['Date'];
  /** The last time the rule was triggered */
  lastTriggeredAt?: Maybe<Scalars['Date']>;
  /** The current rule states */
  state?: Maybe<RuleState>;
  status: RuleStatus;
  /** The metric being monitored */
  metric?: Maybe<Metric>;
  condition: RuleConditionInterface;
  /** Rule notification channels */
  channels: Array<NotificationChannel>;
  /** Options controlling the generation of events */
  options?: Maybe<RuleAlertOptions>;
  alerts: Array<Maybe<RuleAlert>>;
  /** The current count of alerts available for this rule */
  alertCount: Scalars['Int'];
  /** The total number of failures */
  totalFailures: Scalars['Int'];
};


export type RuleAlertsArgs = {
  input?: Maybe<RuleAlertsInput>;
};

export type RuleActivateInput = {
  queueId: Scalars['ID'];
  ruleId: Scalars['ID'];
};

export type RuleActivatePayload = {
  isActive: Scalars['Boolean'];
  rule: Rule;
};

/** Information required to add or edit a Rule */
export type RuleAddInput = {
  /** The id of the queue to which the rule belongs */
  queueId: Scalars['ID'];
  /** The names of the rule */
  name: Scalars['String'];
  /** A helpful description of the rule */
  description?: Maybe<Scalars['String']>;
  severity?: Maybe<Severity>;
  /** Is this rule active or not */
  isActive: Scalars['Boolean'];
  /** Optional data passed on to alerts */
  payload?: Maybe<Scalars['JSONObject']>;
  /** Optional text for message when an alert is raised. Markdown and handlebars supported */
  message?: Maybe<Scalars['String']>;
  /** The id of the metric being monitored */
  metricId: Scalars['String'];
  /** The rule condition */
  condition: RuleConditionInput;
  /** Notification channel ids */
  channels?: Maybe<Array<Scalars['String']>>;
  /** Options controlling the generation of events */
  options?: Maybe<RuleAlertOptionsInput>;
};

/** An event recording the occurrence of an rule violation or reset */
export type RuleAlert = {
  id: Scalars['ID'];
  /** The id of the rule that raised this alert */
  ruleId: Scalars['String'];
  status: Scalars['String'];
  /** Timestamp of when this alert was raised */
  raisedAt: Scalars['DateTime'];
  /** Timestamp of when this alert was reset */
  resetAt?: Maybe<Scalars['DateTime']>;
  /** The metric value that crossed the threshold. */
  value: Scalars['Float'];
  /** State that triggered alert */
  state?: Maybe<Scalars['JSONObject']>;
  /** The number of failures before this alert was generated */
  failures: Scalars['Int'];
  /** Optional rule specific data. Corresponds to Rule.payload */
  payload?: Maybe<Scalars['JSONObject']>;
  /** Error level */
  errorLevel?: Maybe<ErrorLevel>;
  /** A categorization of the severity of the rule type */
  severity?: Maybe<Severity>;
  /** Has the alert been read or not */
  isRead: Scalars['Boolean'];
};

export type RuleAlertDeleteInput = {
  queueId: Scalars['ID'];
  ruleId: Scalars['ID'];
  alertId: Scalars['ID'];
};

export type RuleAlertDeletePayload = {
  ruleId: Scalars['ID'];
  rule?: Maybe<Rule>;
  isDeleted: Scalars['Boolean'];
};

export type RuleAlertMarkAsReadInput = {
  queueId: Scalars['ID'];
  ruleId: Scalars['ID'];
  alertId: Scalars['ID'];
  isRead: Scalars['Boolean'];
};

export type RuleAlertMarkAsReadPayload = {
  alert: RuleAlert;
};

/** Options for raising alerts for a Rule */
export type RuleAlertOptions = {
  /** a timeout after startup (in ms) during which no alerts are raised, irrespective of the truthiness of the rule condition. */
  warmupWindow?: Maybe<Scalars['Duration']>;
  /** The minimum number of violations before an alert can be raised */
  failureThreshold?: Maybe<Scalars['Int']>;
  /** Optional number of consecutive successful method executions to close then alert. Default 1 */
  successThreshold?: Maybe<Scalars['Int']>;
  /**
   * The max number of alerts to receive per event trigger in case the condition is met.
   *  In this case the "event" is a single period between the rule VIOLATION and RESET states.
   */
  maxAlertsPerEvent?: Maybe<Scalars['Int']>;
  /** How long an triggered rule must be without failures before resetting it to NORMAL. In conjunction with "alertOnReset", this can be used to prevent a possible storm of notifications when a rule condition passes and fails in rapid succession ("flapping") */
  recoveryWindow?: Maybe<Scalars['Duration']>;
  /** If specified, the minimum time between alerts for the same incident */
  notifyInterval?: Maybe<Scalars['Duration']>;
  /** Raise an alert after an event trigger when the situation returns to normal */
  alertOnReset?: Maybe<Scalars['Boolean']>;
};

export type RuleAlertOptionsInput = {
  /** a timeout after startup (in ms) during which no alerts are raised, irrespective of the truthiness of the rule condition. */
  warmupWindow?: Maybe<Scalars['Duration']>;
  /** The minimum number of violations before an alert can be raised */
  failureThreshold?: Maybe<Scalars['Int']>;
  /** Optional number of consecutive successful method executions to close then alert. Default 1 */
  successThreshold?: Maybe<Scalars['Int']>;
  /**
   * The max number of alerts to receive per event trigger in case the condition is met.
   *  In this case the "event" is a single period between the rule VIOLATION and RESET states.
   */
  maxAlertsPerEvent?: Maybe<Scalars['Int']>;
  /** How long an triggered rule must be without failures before resetting it to NORMAL. In conjunction with "alertOnReset", this can be used to prevent a possible storm of notifications when a rule condition passes and fails in rapid succession ("flapping") */
  recoveryWindow?: Maybe<Scalars['Duration']>;
  /** If specified, the minimum time between alerts for the same incident */
  notifyInterval?: Maybe<Scalars['Duration']>;
  /** Raise an alert after an event trigger when the situation returns to normal */
  alertOnReset?: Maybe<Scalars['Boolean']>;
};

export type RuleAlertsClearInput = {
  queueId: Scalars['ID'];
  ruleId: Scalars['ID'];
};

export type RuleAlertsClearPayload = {
  /** The count of deleted alerts */
  deletedItems: Scalars['Int'];
  rule: Rule;
};

export type RuleAlertsInput = {
  start?: Maybe<Scalars['Int']>;
  end?: Maybe<Scalars['Int']>;
  sortOrder?: Maybe<SortOrderEnum>;
};

export enum RuleCircuitState {
  Closed = 'CLOSED',
  Open = 'OPEN',
  HalfOpen = 'HALF_OPEN'
}

export type RuleConditionInput = {
  type: RuleType;
  changeCondition?: Maybe<ChangeConditionInput>;
  peakCondition?: Maybe<PeakConditionInput>;
  thresholdCondition?: Maybe<ThresholdConditionInput>;
};

/** Describes a queue condition were monitoring. */
export type RuleConditionInterface = {
  /** The value needed to trigger an error notification */
  errorThreshold: Scalars['Float'];
  /** The value needed to trigger an warning notification */
  warningThreshold?: Maybe<Scalars['Float']>;
  /** The comparison operator */
  operator: RuleOperator;
};

export type RuleDeactivateInput = {
  queueId: Scalars['ID'];
  ruleId: Scalars['ID'];
};

export type RuleDeactivatePayload = {
  isActive: Scalars['Boolean'];
  rule: Rule;
};

export type RuleDeleteInput = {
  queueId: Scalars['ID'];
  ruleId: Scalars['ID'];
};

export type RuleDeletePayload = {
  ruleId: Scalars['ID'];
  queueId: Scalars['ID'];
  isDeleted: Scalars['Boolean'];
};

export enum RuleOperator {
  Eq = 'EQ',
  Ne = 'NE',
  Gt = 'GT',
  Lt = 'LT',
  Gte = 'GTE',
  Lte = 'LTE'
}

export enum RuleState {
  Normal = 'NORMAL',
  Warning = 'WARNING',
  Error = 'ERROR',
  Muted = 'MUTED'
}

/** Real time status of a Rule */
export type RuleStatus = {
  /** Circuit breaker state. */
  circuitState?: Maybe<RuleCircuitState>;
  /** The rule state. */
  state?: Maybe<RuleState>;
  /** The number of failures for the current event (from trigger to close) */
  failures: Scalars['Int'];
  /** The total number of failures in the lifetime of the rule */
  totalFailures: Scalars['Int'];
  /** The number of successful rule invocations after an alert has triggered. */
  successes: Scalars['Int'];
  /** The number of alerts raised for the current failure event (between trigger and close) */
  alertCount: Scalars['Int'];
  /** The last time the rule triggered */
  lastFailure?: Maybe<Scalars['Date']>;
  /** The last time a notification was sent */
  lastNotification?: Maybe<Scalars['Date']>;
};

export enum RuleType {
  Threshold = 'THRESHOLD',
  Peak = 'PEAK',
  Change = 'CHANGE'
}

/** Information needed to update a rule */
export type RuleUpdateInput = {
  /** The id of the queue to which the rule belongs */
  queueId: Scalars['ID'];
  /** The names of the rule */
  name?: Maybe<Scalars['String']>;
  /** A helpful description of the rule */
  description?: Maybe<Scalars['String']>;
  severity?: Maybe<Severity>;
  /** Is this rule active or not */
  isActive?: Maybe<Scalars['Boolean']>;
  /** Optional data passed on to alerts */
  payload?: Maybe<Scalars['JSONObject']>;
  /** Optional text for message when an alert is raised. Markdown and handlebars supported */
  message?: Maybe<Scalars['String']>;
  /** The id of the metric being monitored */
  metricId?: Maybe<Scalars['String']>;
  /** The rule condition */
  condition: RuleConditionInput;
  /** Notification channel ids */
  channels?: Maybe<Array<Scalars['String']>>;
  /** Options controlling the generation of events */
  options?: Maybe<RuleAlertOptionsInput>;
  /** The id of the the rule to update */
  id: Scalars['ID'];
};

export enum Severity {
  Info = 'INFO',
  Warning = 'WARNING',
  Error = 'ERROR',
  Critical = 'CRITICAL'
}

/** A channel which sends notifications through slack */
export type SlackNotificationChannel = NotificationChannel & {
  id: Scalars['ID'];
  /** The type of the channel, e.g. slack, email, webhook etc */
  type: Scalars['String'];
  /** The name of the channel */
  name: Scalars['String'];
  /** Is the channel enabled ? */
  enabled: Scalars['Boolean'];
  /** Timestamp of channel creation */
  createdAt?: Maybe<Scalars['Date']>;
  /** Timestamp of last channel update */
  updatedAt?: Maybe<Scalars['Date']>;
  /** The slack webhook to post messages to */
  webhook: Scalars['URL'];
  /** The slack webhook to post messages to */
  channel?: Maybe<Scalars['String']>;
  /** A valid slack auth token. Not needed if a webhook is specified */
  token?: Maybe<Scalars['String']>;
};

export type SlackNotificationChannelAddInput = {
  hostId: Scalars['ID'];
  channel: SlackNotificationChannelUpdate;
};

export type SlackNotificationChannelUpdate = {
  /** The type of the channel, e.g. slack, email, webhook etc */
  type: Scalars['String'];
  /** The name of the channel */
  name: Scalars['String'];
  /** Is the channel enabled ? */
  enabled: Scalars['Boolean'];
  /** The slack webhook to post messages to */
  webhook: Scalars['URL'];
  /** The slack webhook to post messages to */
  channel?: Maybe<Scalars['String']>;
  /** A valid slack auth token. Not needed if a webhook is specified */
  token?: Maybe<Scalars['String']>;
};

export type SlackNotificationChannelUpdateInput = {
  hostId: Scalars['ID'];
  channel: SlackNotificationChannelUpdate;
};

export enum SortOrderEnum {
  Asc = 'ASC',
  Desc = 'DESC'
}

export enum StatsGranularity {
  Minute = 'Minute',
  Hour = 'Hour',
  Day = 'Day',
  Week = 'Week',
  Month = 'Month'
}

/** Queue stats filter to getting latest snapshot. */
export type StatsLatestInput = {
  /** An optional job name to filter on */
  jobName?: Maybe<Scalars['String']>;
  /** The metric requested */
  metric?: Maybe<StatsMetricType>;
  /** Stats snapshot granularity */
  granularity?: Maybe<StatsGranularity>;
};

export enum StatsMetricType {
  Latency = 'Latency',
  Wait = 'Wait'
}

/** Queue stats filter. */
export type StatsQueryInput = {
  /** An optional job name to filter on */
  jobName?: Maybe<Scalars['String']>;
  /** The metric requested */
  metric?: Maybe<StatsMetricType>;
  /** Stats snapshot granularity */
  granularity: StatsGranularity;
  /** An expression specifying the range to query e.g. yesterday, last_7days */
  range: Scalars['String'];
};

/** Queue stats rates filter. */
export type StatsRateQueryInput = {
  /** An optional job name to filter on */
  jobName?: Maybe<Scalars['String']>;
  /** Stats snapshot granularity */
  granularity: StatsGranularity;
  /** An expression specifying the range to query e.g. yesterday, last_7days */
  range: Scalars['String'];
};

/** Queue job stats snapshot. */
export type StatsSnapshot = JobStatsInterface & {
  /** The sample size */
  count: Scalars['Int'];
  /** The number of failed jobs in the sample interval */
  failed: Scalars['Int'];
  /** The number of completed jobs in the sample interval */
  completed: Scalars['Int'];
  /** The start of the interval */
  startTime: Scalars['Date'];
  /** The end of the interval */
  endTime: Scalars['Date'];
  /** The average of values during the period */
  mean: Scalars['Float'];
  /** The standard deviation of the dataset over the sample period */
  stddev: Scalars['Float'];
  /** The minimum value in the data set */
  min: Scalars['Float'];
  /** The maximum value in the data set */
  max: Scalars['Float'];
  /** The median value of the data set */
  median: Scalars['Float'];
  /** The 25th percentile */
  p90: Scalars['Float'];
  /** The 95th percentile */
  p95: Scalars['Float'];
  /** The 99th percentile */
  p99: Scalars['Float'];
  /** The 99.5th percentile */
  p995: Scalars['Float'];
  /** The average rate of events over the entire lifetime of measurement (e.g., the total number of requests handled,divided by the number of seconds the process has been running), it doesn’t offer a sense of recency. */
  meanRate: Scalars['Float'];
  /** One minute exponentially weighted moving average */
  m1Rate: Scalars['Float'];
  /** Five minute exponentially weighted moving average */
  m5Rate: Scalars['Float'];
  /** Fifteen minute exponentially weighted moving average */
  m15Rate: Scalars['Float'];
};

export type StatsSpanInput = {
  /** The host/queue to query */
  id: Scalars['ID'];
  jobName?: Maybe<Scalars['String']>;
  granularity?: Maybe<StatsGranularity>;
};

/** Filtering options for stats subscriptions. */
export type StatsUpdatedSubscriptionFilter = {
  /** The id of the queue or host to subscribe to */
  id: Scalars['ID'];
  /** An optional job name for filtering */
  jobName?: Maybe<Scalars['String']>;
  /** The metric requested */
  metric?: Maybe<StatsMetricType>;
  /** Data granularity */
  granularity?: Maybe<StatsGranularity>;
};

export type Subscription = {
  onNotificationChannelCreated: OnNotificationChannelCreatedPayload;
  onNotificationChannelDeleted: OnNotificationChannelDeletedPayload;
  /** Subscribe for updates in host statistical snapshots */
  onHostStatsUpdated: StatsSnapshot;
  onJobAdded: OnJobAddedPayload;
  onJobUpdated: OnJobUpdatedPayload;
  onJobProgress: OnJobProgressPayload;
  onJobRemoved: OnJobRemovedPayload;
  onJobLogAdded: OnJobLogAddedPayload;
  /** Returns job active events */
  obJobActive?: Maybe<OnJobStateChangePayload>;
  /** Returns job failed events */
  obJobFailed?: Maybe<OnJobStateChangePayload>;
  /** Returns job completed events */
  obJobCompleted?: Maybe<OnJobStateChangePayload>;
  /** Returns job stalled events */
  obJobStalled?: Maybe<OnJobStateChangePayload>;
  onJobDelayed: OnJobDelayedPayload;
  onQueuePaused: OnQueuePausedPayload;
  onQueueResumed: OnQueueResumedPayload;
  onQueueDeleted: OnQueueDeletedPayload;
  onQueueWorkersChanged: OnQueueWorkersChangedPayload;
  onQueueStateChanged: OnQueueStateChangedPayload;
  onQueueJobCountsChanged: OnQueueJobCountsChangedPayload;
  onQueueJobUpdates: OnQueueJobUpdatesPayload;
  /** Subscribe for updates in queue statistical snapshots */
  onQueueStatsUpdated: StatsSnapshot;
  onQueueRegistered: OnQueueRegisteredPayload;
  onQueueUnregistered: OnQueueUnregisteredPayload;
  /** Returns an updated count of workers assigned to a queue */
  onQueueWorkersCountChanged: OnQueueWorkersCountPayload;
  onQueueMetricValueUpdated: OnQueueMetricValueUpdated;
  onRuleAlert: OnRuleAlertPayload;
};


export type SubscriptionOnNotificationChannelCreatedArgs = {
  hostId: Scalars['String'];
};


export type SubscriptionOnNotificationChannelDeletedArgs = {
  hostId: Scalars['String'];
};


export type SubscriptionOnHostStatsUpdatedArgs = {
  input: StatsUpdatedSubscriptionFilter;
};


export type SubscriptionOnJobAddedArgs = {
  queueId: Scalars['ID'];
};


export type SubscriptionOnJobUpdatedArgs = {
  queueId: Scalars['String'];
  jobId: Scalars['String'];
};


export type SubscriptionOnJobProgressArgs = {
  queueId: Scalars['String'];
  jobId: Scalars['String'];
};


export type SubscriptionOnJobRemovedArgs = {
  queueId: Scalars['String'];
  jobId: Scalars['String'];
};


export type SubscriptionOnJobLogAddedArgs = {
  queueId: Scalars['String'];
  jobId: Scalars['String'];
};


export type SubscriptionObJobActiveArgs = {
  queueId: Scalars['String'];
  jobId: Scalars['String'];
};


export type SubscriptionObJobFailedArgs = {
  queueId: Scalars['String'];
  jobId: Scalars['String'];
};


export type SubscriptionObJobCompletedArgs = {
  queueId: Scalars['String'];
  jobId: Scalars['String'];
};


export type SubscriptionObJobStalledArgs = {
  queueId: Scalars['String'];
  jobId: Scalars['String'];
};


export type SubscriptionOnJobDelayedArgs = {
  prefix?: Scalars['String'];
  queueId: Scalars['ID'];
};


export type SubscriptionOnQueuePausedArgs = {
  queueId: Scalars['String'];
};


export type SubscriptionOnQueueResumedArgs = {
  queueId: Scalars['ID'];
};


export type SubscriptionOnQueueDeletedArgs = {
  hostId: Scalars['String'];
};


export type SubscriptionOnQueueWorkersChangedArgs = {
  queueId: Scalars['String'];
};


export type SubscriptionOnQueueStateChangedArgs = {
  queueId: Scalars['String'];
};


export type SubscriptionOnQueueJobCountsChangedArgs = {
  queueId: Scalars['String'];
};


export type SubscriptionOnQueueJobUpdatesArgs = {
  input: QueueJobUpdatesFilterInput;
};


export type SubscriptionOnQueueStatsUpdatedArgs = {
  input: StatsUpdatedSubscriptionFilter;
};


export type SubscriptionOnQueueRegisteredArgs = {
  hostId: Scalars['String'];
};


export type SubscriptionOnQueueUnregisteredArgs = {
  hostId: Scalars['String'];
};


export type SubscriptionOnQueueWorkersCountChangedArgs = {
  queueId: Scalars['String'];
};


export type SubscriptionOnQueueMetricValueUpdatedArgs = {
  queueId: Scalars['String'];
  metricId: Scalars['String'];
};


export type SubscriptionOnRuleAlertArgs = {
  queueId: Scalars['ID'];
  ruleIds?: Maybe<Array<Scalars['String']>>;
};

/** Basic descriptive statistics */
export type SummaryStatistics = {
  /** The number of input values included in calculations */
  count: Scalars['Int'];
  /** The minimum value. */
  min?: Maybe<Scalars['Float']>;
  /** The maximum value. */
  max?: Maybe<Scalars['Float']>;
  /** The average value - the sum of all values over the number of values. */
  mean: Scalars['Float'];
  /** The median is the middle number of a list. This is often a good indicator of "the middle" when there are outliers that skew the mean value. */
  median?: Maybe<Scalars['Float']>;
  /** The variance is the sum of squared deviations from the mean. */
  variance: Scalars['Float'];
  /**
   * The sample variance is the sum of squared deviations from the mean.
   * The sample variance is distinguished from the variance by dividing the sum of squared deviations by (n - 1) instead of n. This corrects the bias in estimating a value from a sample set rather than the full population.
   */
  sampleVariance: Scalars['Float'];
  /** The standard deviation is the square root of the variance. This is also known as the population standard deviation. It is useful for measuring the amount of variation or dispersion in a set of values. */
  standardDeviation: Scalars['Float'];
  /** The standard deviation is the square root of the sample variance. */
  sampleStandardDeviation: Scalars['Float'];
};

export type ThresholdConditionInput = {
  /** The value needed to trigger an error notification */
  errorThreshold: Scalars['Float'];
  /** The value needed to trigger an warning notification */
  warningThreshold?: Maybe<Scalars['Float']>;
  /** The comparison operator */
  operator: RuleOperator;
};

export type TimeSpan = {
  startTime: Scalars['DateTime'];
  endTime: Scalars['DateTime'];
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



export type ValidateJobOptionsPayload = {
  isValid: Scalars['Boolean'];
  errors: Array<Scalars['String']>;
};

/** A channel that posts notifications to a webhook */
export type WebhookNotificationChannel = NotificationChannel & {
  id: Scalars['ID'];
  /** The type of the channel, e.g. slack, email, webhook etc */
  type: Scalars['String'];
  /** The name of the channel */
  name: Scalars['String'];
  /** Is the channel enabled ? */
  enabled: Scalars['Boolean'];
  /** Timestamp of channel creation */
  createdAt?: Maybe<Scalars['Date']>;
  /** Timestamp of last channel update */
  updatedAt?: Maybe<Scalars['Date']>;
  /** Url to send data to */
  url: Scalars['URL'];
  /** The HTTP method to use */
  method?: Maybe<HttpMethodEnum>;
  /** Optional request headers */
  headers?: Maybe<Scalars['JSONObject']>;
  /** Milliseconds to wait for the server to end the response before aborting the client. By default, there is no timeout. */
  timeout?: Maybe<Scalars['Duration']>;
  /** The number of times to retry the client */
  retry?: Maybe<Scalars['Int']>;
  /** Defines if redirect responses should be followed automatically. */
  followRedirect?: Maybe<Scalars['Boolean']>;
  /** Set this to true to allow sending body for the GET method. This option is only meant to interact with non-compliant servers when you have no other choice. */
  allowGetBody?: Maybe<Scalars['Boolean']>;
  /** Optional success http status codes. Defaults to http codes 200 - 206 */
  httpSuccessCodes?: Maybe<Array<Scalars['Int']>>;
};

export type WebhookNotificationChannelAddInput = {
  hostId: Scalars['ID'];
  channel: WebhookNotificationChannelUpdate;
};

export type WebhookNotificationChannelUpdate = {
  /** The type of the channel, e.g. slack, email, webhook etc */
  type: Scalars['String'];
  /** The name of the channel */
  name: Scalars['String'];
  /** Is the channel enabled ? */
  enabled: Scalars['Boolean'];
  /** Url to send data to */
  url: Scalars['URL'];
  /** The HTTP method to use */
  method?: Maybe<HttpMethodEnum>;
  /** Optional request headers */
  headers?: Maybe<Scalars['JSONObject']>;
  /** Milliseconds to wait for the server to end the response before aborting the client. By default, there is no timeout. */
  timeout?: Maybe<Scalars['Duration']>;
  /** The number of times to retry the client */
  retry?: Maybe<Scalars['Int']>;
  /** Defines if redirect responses should be followed automatically. */
  followRedirect?: Maybe<Scalars['Boolean']>;
  /** Set this to true to allow sending body for the GET method. This option is only meant to interact with non-compliant servers when you have no other choice. */
  allowGetBody?: Maybe<Scalars['Boolean']>;
  /** Optional success http status codes. Defaults to http codes 200 - 206 */
  httpSuccessCodes?: Maybe<Array<Scalars['Int']>>;
};

export type WebhookNotificationChannelUpdateInput = {
  hostId: Scalars['ID'];
  channel: WebhookNotificationChannelUpdate;
};
