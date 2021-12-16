import { RuleCondition } from './rule-conditions';
import { RuleEvaluationState } from './rule-conditions';

/**
 * Options determining when rule alerts are raised.
 */
export interface RuleAlertOptions {
  /**
   * wait a certain duration between first encountering a failure and triggering an alert
   */
  triggerDelay?: number;

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

export type RuleAlertStatus = 'open' | 'close';

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
  readonly status: RuleAlertStatus;
  /** timestamp of when this alert was raised */
  readonly raisedAt: number;
  /** timestamp of when an alert was reset */
  resetAt?: number;
  /** The metric value that crossed the threshold.*/
  readonly value: number;
  /*** The number of failures before the alert was generated */
  readonly failures: number;
  /** Alert title */
  title?: string;
  /** Alert message */
  message?: string;
  /** states which triggered alert */
  readonly state?: RuleEvaluationState;
  readonly errorLevel: ErrorStatus;
  severity: Severity;
  isRead: boolean;
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

export enum ErrorStatus {
  NONE = 'NONE',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
}

export type RuleMetric = {
  readonly type: string;
  options: Record<string, any>;
  [propName: string]: any;
};

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
  STATE_CHANGED = 'rule.state-changed',
}
