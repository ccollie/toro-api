import * as boom from '@hapi/boom';
import { clone, isNil, isString } from 'lodash';
import { parseTimestamp } from '@alpen/shared';
import { systemClock } from '../lib';
import {
  ruleAlertOptionsSchema,
  ruleConditionSchema,
  ruleConfigSchema,
} from './schemas';
import { RuleCondition } from './rule-conditions';
import { RuleState, Severity } from './types';
import { RuleAlertOptions } from './rule-alert';

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

// todo: tags, copy ctor

/** Class representing a rule used to trigger an alert based on a condition.
 * @property {string} id id of the {@link Rule} (required)
 * @property {string} names names for the {@link Rule} (required)
 * @property {string} [description] description for the {@link Rule}
 * @property {Date|Number} createdAt created date.
 * @property {Date|Number} updatedAt last updated date.
 * @property {Object} condition the condition which should trigger an alert
 * @property {Object} [payload] optional alert data
 * @property {string[]} channels channels for alert notifications.
 * @property {Boolean} [ACTIVE=true] true if the {@link Rule} is ACTIVE (will generate alerts).
 */
export class Rule {
  private _channels: string[] = [];
  public readonly id: string;
  public readonly createdAt: number;
  private options: RuleAlertOptions;
  private _condition: RuleCondition = Object.create(null);
  public state: RuleState = RuleState.NORMAL;
  public metricId: string;
  public queueId: string;
  public name: string;
  public message: string;
  public description: string;
  public updatedAt?: number;
  public isActive: boolean;
  public payload: Record<string, any>;
  public severity: Severity;
  public lastTriggeredAt?: number;
  public totalFailures = 0;
  public alertCount = 0;

  /**
   * Constructs a {@link Rule}. A Rule sets conditions for actions based
   * on the states of queues and (possibly) Jobs.
   *
   * @class Rule
   * @param {RuleConfigOptions} config configuration for the {@link Rule}
   */
  constructor(config: RuleConfigOptions) {
    const { error, value: opts } = ruleConfigSchema.validate(config);
    if (error) {
      throw error;
    }

    const {
      id,
      name,
      condition,
      metricId,
      active,
      payload,
      description,
      state,
      lastTriggeredAt,
      queueId,
      totalFailures = 0,
      alertCount = 0,
    } = opts;

    /**
     * @property {string} id the unique id of the {@link Rule}.
     */
    this.id = id;
    this.state = state ?? RuleState.NORMAL;
    this.queueId = queueId;
    this.totalFailures = totalFailures;
    this.alertCount = alertCount;

    this.options = {
      notifyInterval: 0,
      maxAlertsPerEvent: 1,
      ...config.options,
    };

    this.createdAt = opts.createdAt
      ? parseTimestamp(opts.createdAt)
      : systemClock.getTime();
    this.updatedAt = opts.updatedAt
      ? parseTimestamp(opts.createdAt)
      : this.createdAt;

    if (lastTriggeredAt !== undefined) {
      this.lastTriggeredAt = parseTimestamp(lastTriggeredAt);
    } else {
      this.lastTriggeredAt = lastTriggeredAt;
    }

    this.name = name;
    /**
     * @property {string} description a description for the rule. Useful for UI.
     */
    this.description = description;

    this.isActive = active ?? true;
    this.payload = payload;
    this.message = config.message;
    this._channels = config.channels || [];

    // Alerts should go somewhere, so if we're ACTIVE, make sure they're
    // persisted or broadcast to a notification channel. Note that we
    // may need to reconsider this in light of dynamic subscriptions (e.g. graphql)
    // if (!this.channels.length && (!this.ACTIVE || !this.persist)) {
    //   throw boom.badRequest(
    //     'At least one channel must be specified for a rule',
    //   );
    // }

    this.metricId = metricId;
    // todo: basic condition validation
    this.condition = condition;
    this.severity = config.severity || Severity.WARNING;
  }

  private validateAlertOptions(opts: RuleAlertOptions) {
    const { error, value } = ruleAlertOptionsSchema.validate(opts);
    if (error) {
      throw error;
    }
    return value;
  }

  get alertOptions(): RuleAlertOptions {
    return this.options;
  }

  set alertOptions(opts: RuleAlertOptions) {
    this.options = this.validateAlertOptions(opts);
  }

  /**
   * Notification channels for alert notifications
   */
  get channels(): string[] {
    return this._channels ?? [];
  }

  set channels(value: string[]) {
    this._channels = value;
  }

  get condition(): RuleCondition {
    return this._condition;
  }

  set condition(cond: RuleCondition) {
    const { error, value } = ruleConditionSchema.validate(cond);
    if (error) {
      throw error;
    }
    this._condition = cond;
  }

  get alertOnReset(): boolean {
    return this.alertOptions.alertOnReset;
  }

  public static fromJSON(json: string | any): Rule {
    if (isString(json)) {
      json = JSON.parse(json);
    }
    if (isNil(json)) {
      throw boom.badRequest('Expected a JSON object or JSON encoded string');
    }
    return new Rule(json);
  }

  toJSON(): Record<string, any> {
    const options = clone(this.options);
    const createdAt = this.createdAt
      ? parseTimestamp(this.createdAt)
      : undefined;
    const updatedAt = this.updatedAt
      ? parseTimestamp(this.updatedAt)
      : undefined;

    return {
      id: this.id,
      name: this.name,
      description: this.description,
      createdAt,
      updatedAt,
      options,
      queueId: this.queueId,
      metricId: this.metricId,
      condition: clone(this.condition),
      isActive: this.isActive,
      message: this.message,
      payload: clone(this.payload),
      channels: [...this.channels],
      severity: this.severity,
      state: this.state,
      alertCount: this.alertCount,
      totalFailures: this.totalFailures,
      lastTriggeredAt: this.lastTriggeredAt,
    };
  }
}
