export enum RuleType {
  THRESHOLD = 'threshold',
  PEAK = 'peak',
  CHANGE = 'change',
}

export enum PeakSignalDirection {
  ABOVE = 'above',
  BELOW = 'below',
  BOTH = 'both',
}

export enum RuleState {
  NORMAL = 'NORMAL',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  MUTED = 'MUTED',
}

export enum Severity {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export enum ErrorLevel {
  WARNING = 'warning',
  CRITICAL = 'critical',
  NONE = 'none',
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
  eq = '==',
  ne = '!=',
  gt = '>',
  lt = '<',
  gte = '>=',
  lte = '<=',
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
  Max = 'max',
  Min = 'min',
  Avg = 'avg',
  Sum = 'sum',
  P90 = 'p90',
  P95 = 'p95',
  P99 = 'p99',
}

export interface ChangeConditionOptions extends RuleConditionThresholds {
  /**
  The sliding window for metric measurement
   */
  timeWindow: number;
  /**
   * Lookback period (ms). How far back are we going to compare
   * eg 1 hour means we're comparing now vs 1 hour ago
   */
  timeShift?: number;
  aggregationType: ChangeAggregationType;
  readonly changeType: 'CHANGE' | 'PCT';
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
  RULE_ADDED = 'rule.added',
  RULE_DELETED = 'rule.deleted',
  RULE_UPDATED = 'rule.updated',
  RULE_ALERTS_CLEARED = 'rule.alerts-cleared',
  RULE_ACTIVATED = 'rule.activated',
  RULE_DEACTIVATED = 'rule.deactivated',
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
  minViolations?: number;

  /**
   * the max number of alerts to receive per event trigger in case the condition is met.
   */
  maxAlertsPerEvent?: number;

  /**
   * The minimum amount of time after the last notification before a new alert is raised
   * on for same incident.
   * */
  renotifyInterval?: number;

  /** raise an alert after an event trigger when the situation returns to normal */
  alertOnReset?: boolean;

  /**
   * Duration (ms) after which to raise alerts or notifications in case the condition is met.
   * This is useful for events which are normally transient and resolve quickly but may periodically
   * persist longer than usual, or for not sending notifications out too quickly.
   */
  triggerWindow?: number;

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
  /** metric descriptor */
  metric: RuleMetric;
  /** the condition which should trigger an alert */
  condition: RuleCondition;
  /** true if the {@link Rule} is ACTIVE. */
  active?: boolean;
  /*** Optional text for message when an alert is raised */
  message?: string;
  /** optional data passed on to alerts */
  payload?: Record<string, any>;
  /** options for {@link Rule} alerts */
  options?: RuleAlertOptions;
  /** channels for alert notifications. */
  channels?: string[];
  severity?: Severity;
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
  /** the alert event (triggered or reset) */
  readonly event: string;
  /** timestamp of when this alert was raised */
  readonly start: number;
  /** timestamp of when an alert was reset */
  end?: number;
  /** The value of the alert threshold set in the rule’s alert conditions. */
  readonly threshold: number;
  /** The metric value that crossed the threshold.*/
  readonly value: number;
  /** The metric value that reset the threshold. */
  resetValue?: number;
  /*** The number of violations before the alert was generated */
  readonly violations: number;
  /** Alert message */
  message?: string;
  /** states which triggered alert */
  readonly state?: Record<string, any>;
  readonly errorLevel: ErrorLevel;
  severity: Severity;
  [propName: string]: any;
}
