export enum RuleType {
  THRESHOLD = 'THRESHOLD',
  PEAK = 'PEAK',
  CHANGE = 'CHANGE',
}

export enum PeakSignalDirection {
  ABOVE = 'ABOVE',
  BELOW = 'BELOW',
  BOTH = 'BOTH',
}

export enum RuleState {
  NORMAL = 'NORMAL',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  MUTED = 'MUTED',
}

export enum Severity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export enum ErrorLevel {
  NONE = 'NONE',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
}

/**
 * Thresholds for triggering an alert
 */
export interface NotificationThresholds {
  /**
   * The value used to trigger an error notification.
   */
  errorThreshold: number;
  /**
   * The value used to trigger an warning notification.
   */
  warningThreshold?: number;
}

export enum RuleOperator {
  EQ = 'EQ',
  NE = 'NE',
  GT = 'GT',
  LT = 'LT',
  GTE = 'GTE',
  LTE = 'LTE',
}

export interface RuleConditionThresholds extends NotificationThresholds {
  readonly operator: RuleOperator;
}

export interface ThresholdCondition extends RuleConditionThresholds {
  readonly type: RuleType.THRESHOLD;
}

export interface PeakCondition extends RuleConditionThresholds {
  readonly type: RuleType.PEAK;
  /**
   * the influence (between 0 and 1) of new signals on the mean and standard deviation
   * where 1 is normal influence, 0.5 is half
   */
  influence?: number;
  /**
   * The lag of the moving window (in milliseconds)
   * For example, a lag of 5000 will use the last 5 seconds of observations
   * to smooth the data.
   */
  lag?: number;
  /**
   * Trigger if value is above, below, or either above/below the given
   * deviation threshold
   */
  direction?: PeakSignalDirection;
}

export enum ChangeAggregationType {
  MAX = 'MAX',
  MIN = 'MIN',
  AVG = 'AVG',
  SUM = 'SUM',
  P90 = 'P90',
  P95 = 'P95',
  P99 = 'P99',
}

export enum ChangeTypeEnum {
  CHANGE = 'CHANGE',
  PCT = 'PCT',
}

export interface ChangeConditionOptions extends RuleConditionThresholds {
  readonly changeType: ChangeTypeEnum;
  /**
  The sliding window for metric measurement
   */
  windowSize: number;
  /**
   * Lookback period (ms). How far back are we going to compare
   * eg 1 hour means we're comparing now vs 1 hour ago
   */
  timeShift?: number;
  aggregationType: ChangeAggregationType;
  sampleInterval?: number;
}

/**
 * A change alert compares the absolute or relative (%) change in value between
 * a given time ago and now against a given threshold.
 */
export interface ChangeCondition extends ChangeConditionOptions {
  readonly type: RuleType.CHANGE;
}

export type RuleMetric = {
  readonly type: string;
  options: Record<string, any>;
  [propName: string]: any;
};

export type RuleCondition =
  | PeakCondition
  | ThresholdCondition
  | ChangeCondition;

export enum RuleEventsEnum {
  ALERT_TRIGGERED = 'alert.triggered',
  ALERT_RESET = 'alert.reset',
  ALERT_DELETED = 'alert.deleted',
  ALERT_UPDATED = 'alert.updated',
  RULE_ADDED = 'rule.added',
  RULE_DELETED = 'rule.deleted',
  RULE_UPDATED = 'rule.updated',
  RULE_ALERTS_CLEARED = 'rule.alerts-cleared',
  RULE_ACTIVATED = 'rule.activated',
  RULE_DEACTIVATED = 'rule.deactivated',
  RULE_TRIGGERED = 'rule.triggered',
  RULE_RESET = 'rule.reset',
  STATE_CHANGED = 'rule.state-changed',
}

/**
 * Options determining when rule alerts are raised.
 */
export interface RuleAlertOptions {
  /** a timeout after startup (in ms) during which no alerts are raised, irrespective of
   * the truthiness of the rule condition.
   */
  warmupWindow?: number;

  /**
   * The minimum number of violations in "delay" period before an alert can be raised
   */
  failureThreshold?: number;

  /**
   * Number of consecutive successful method executions to transition from
   */
  successThreshold?: number;

  /**
   * the max number of alerts to receive per event trigger in case the condition is met.
   */
  maxAlertsPerEvent?: number;

  /**
   * The minimum amount of time after the last notification before a new alert is raised
   * on for same incident.
   * */
  notifyInterval?: number;

  /** raise an alert after an event trigger when the situation returns to normal */
  alertOnReset?: boolean;

  /**
   * An optional delay (ms) describing how long an anomalous metric must be normal before the alert
   * recovers.
   * In conjunction with "alertOnReset", this can be used to prevent a possible storm of
   * notifications when a rule condition passes and fails in rapid succession
   */
  recoveryWindow?: number;
}

/** configuration options for a {@link Rule} */
export interface RuleConfigOptions {
  /** the Rule id */
  id?: string;
  /** names of the rule */
  name: string;
  /** description of the {@link Rule} */
  description?: string;
  /** Rule creation timestamp */
  createdAt?: number;
  /** Rule modification timestamp */
  updatedAt?: number;
  /** id of monitored metric */
  metricId: string;
  /** the condition which should trigger an alert */
  condition: RuleCondition;
  /** true if the {@link Rule} is ACTIVE. */
  isActive?: boolean;
  /*** Optional text for message when an alert is raised */
  message?: string;
  /** optional data passed on to alerts */
  payload?: Record<string, any>;
  /** options for {@link Rule} alerts */
  options?: RuleAlertOptions;
  /** channels for alert notifications. */
  channels?: string[];
  severity?: Severity;
  state?: RuleState;
  lastTriggeredAt?: number;
  totalFailures?: number;
  /** Total (current) number of alerts */
  alertCount?: number;
}

/**
 * An alert raised as the result of a Rule violation
 * @typedef {Object} RuleAlert
 * @property {string} [event] event names
 * @property {Number} start epoch seconds of when this alert was raised
 * @property {Number} [end] epoch seconds of when this alert was reset
 * @property {Object} states queue states that triggered alert
 * @property {Object} [payload] optional alert data
 */
export interface RuleAlert {
  readonly id: string;
  readonly ruleId: string;
  /** the alert state (triggered or reset) */
  readonly status: 'open' | 'close';
  /** timestamp of when this alert was raised */
  readonly raisedAt: number;
  /** timestamp of when an alert was reset */
  resetAt?: number;
  /** The metric value that crossed the threshold.*/
  readonly value: number;
  /*** The number of failures before the alert was generated */
  readonly failures: number;
  /** Alert message */
  message?: string;
  /** states which triggered alert */
  readonly state?: Record<string, any>;
  readonly errorLevel: ErrorLevel;
  severity: Severity;
  isRead: boolean;
}
