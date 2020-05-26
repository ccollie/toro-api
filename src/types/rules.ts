import { StatsWindow } from 'stats';

/** Specifies a minimum number of requests before a rule is triggered */
export interface RuleVolumeThreshold {
  /** the request threshold */
  value: number;
  /** optional sliding window in which to evaluate the threshold */
  window?: StatsWindow;
}

export interface RuleAlertOptions {
  /** a timeout after startup (in ms) during which no alerts are raised, irrespective of
   * the truthiness of the rule condition.
   */
  warmup?: number;

  /** minimum of requests before an alert can be triggered */
  volumeThreshold?: RuleVolumeThreshold;
  /**
   * Duration (ms) after which to raise alerts or notifications in case the condition is met.
   * This is useful for events which are normally transient by may periodically persist longer
   * than usual, or for not sending notifications out too quickly.
   */
  delay: number;
  /**
   * the number of alerts to receive per event trigger in case the condition is met.
   * This is useful for events which are normally transient by may periodically persist longer
   * than usual, or for not sending notifications out too quickly.
   */
  repeatsPerTrigger: number;

  /** raise an alert after an event trigger when the situation returns to normal */
  alertOnReset: boolean;
}

/** configuration options for a {@link Rule} */
export interface RuleConfigOptions {
  /** the Rule id */
  id?: string;
  /** name of the rule */
  name: string;
  /** description of the {@link Rule} */
  description?: string;
  /** Rule creation timestamp */
  createdAt?: number;
  /** Rule modification timestamp */
  updatedAt?: number;
  /** the mongo-like condition which should trigger an alert */
  condition: any;
  /** channels for alert notifications. */
  notifiers?: string[];
  /** true if the {@link Rule} is active. */
  active?: boolean;
  /** true if the {@link Rule} should persist alerts on the backend. */
  persist?: boolean;
  /** optional data passed on to alerts */
  payload?: any;
  /** Optional sliding window for conditions involving aggregates */
  window?: StatsWindow;
  /** options for {@link Rule} alerts */
  options?: RuleAlertOptions;
}

/**
 * Alert type definition
 * @typedef {Object} RuleAlert
 * @property {string} [event]
 * @property {Number} start epoch seconds of when this alert was raised
 * @property {Number} [end] epoch seconds of when this alert was reset
 * @property {Object} state queue state that triggered alert
 * @property {Object} [payload] optional alert data
 */
export interface RuleAlert {
  /** the id of the rule which triggered this alert */
  ruleId?: string;
  /** the alert event id */
  event?: string;
  /** timestamp of when this alert was raised */
  start: number;
  /** timestamp of when an alert was reset */
  end?: number;
  /** state which triggered alert */
  state?: object;
  /** optional rule specific data to pass to alerts */
  payload?: object;

  [propName: string]: any;
}
