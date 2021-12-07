import { ErrorStatus, Severity } from './types';
import { RuleEvaluationState } from './condition-evaluator';

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
