import boom from '@hapi/boom';
import Emittery, { UnsubscribeFn } from 'emittery';
import { clone, isNil, isString } from 'lodash';
import { parseTimestamp } from '../lib/datetime';
import { Clock, getUniqueId, ManualClock, systemClock } from '../lib';
import { ruleConfigSchema } from './schemas';
import {
  ErrorLevel,
  RuleAlert,
  RuleAlertOptions,
  RuleCondition,
  RuleConfigOptions,
  RuleEventsEnum,
  RuleMetric,
  RuleState,
  Severity,
} from '../../types';
import {
  AccurateInterval,
  createAccurateInterval,
} from '../lib/accurateInterval';

const ALERT_COUNT = Symbol('alert-count');

// todo: tags, copy ctor

export interface EvaluationResult {
  value: number;
  success: boolean;
  errorLevel: ErrorLevel;
  state: Record<string, any>;
}

export interface RuleStateChangeEvent {
  state: RuleState;
  ts: number;
  rule: Rule;
}

export type RuleStateChangeHandler = (
  event: RuleStateChangeEvent,
) => void | Promise<void>;

/** Class representing a rule used to trigger an alert based on a condition.
 * @extends Emittery
 * @property {string} id id of the {@link Rule} (required)
 * @property {string} names names for the {@link Rule} (required)
 * @property {string} [description] description for the {@link Rule}
 * @property {Date|Number} createdAt created date.
 * @property {Date|Number} updatedAt last updated date.
 * @property {Object} condition the mongo-like condition which should trigger an alert
 * @property {Object} [payload] optional alert data
 * @property {string[]} channels channels for alert notifications.
 * @property {Boolean} [ACTIVE=true] true if the {@link Rule} is ACTIVE (will generate alerts).
 * @property {Boolean} [persist=true] true if alerts are preserved in Redis.
 */
export class Rule extends Emittery {
  public readonly id: string;
  public readonly createdAt: number;
  private readonly options: RuleAlertOptions;
  private _condition: RuleCondition = Object.create(null);
  private _started = false;
  private _ruleState: RuleState = RuleState.NORMAL;
  private _clock: Clock = new ManualClock();
  private _channels: string[] = [];
  public metric: RuleMetric;
  public queueId: string;
  public name: string;
  public message: string;
  public description: string;
  public updatedAt?: number;
  public isActive: boolean;
  public payload: Record<string, any>;
  public severity: Severity;
  public violations = 0;
  private alertStart?: number;

  /** The timestamp marking the end of the warmupWindow period */
  private _warmupEnd = 0;

  /** Timestamp marking the end of alert delay period */
  private _alertDelayEnd = 0;

  /** Timestamp of last alert */
  private _lastAlertAt = 0;

  /** Timestamp of start of reset */
  private _resetStart = 0;

  private _resetTimer: AccurateInterval;

  /**
   * The metric value that crossed the threshold.
   * @private
   */
  private _triggerValue: number;

  /**
   * Constructs a {@link Rule}. A Rule sets conditions for actions based
   * on the states of queues and (possibly) Jobs.
   *
   * @class Rule
   * @extends Emittery
   * @param {RuleConfigOptions} config configuration for the {@link Rule}
   */
  constructor(config: RuleConfigOptions) {
    super();

    const { error, value: opts } = ruleConfigSchema.validate(config);
    if (error) {
      throw error;
    }

    const {
      id,
      name,
      condition,
      metric,
      active,
      persist,
      payload,
      description,
    } = opts;

    this.onError = this.onError.bind(this);
    this.handleResult = this.handleResult.bind(this);

    /**
     * @property {string} id the unique id of the {@link Rule}.
     */
    this.id = id || getUniqueId();
    this.options = {
      renotifyInterval: 0,
      maxAlertsPerEvent: 0,
      ...config.options,
    };

    this.createdAt = opts.createdAt
      ? parseTimestamp(opts.createdAt)
      : systemClock.getTime();
    this.updatedAt = opts.updatedAt
      ? parseTimestamp(opts.createdAt)
      : this.createdAt;

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

    this.metric = metric;
    // todo: basic condition validation
    this.condition = condition;

    this.alertStart = null;
    this[ALERT_COUNT] = 0;
    this.severity = config.severity || Severity.WARNING;
  }

  get state(): RuleState {
    return this._ruleState;
  }

  get alertOptions(): RuleAlertOptions {
    return this.options;
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

  set condition(value: RuleCondition) {
    this._condition = value;
  }

  get lastAlertAt(): number {
    return this._lastAlertAt;
  }

  private get clock(): Clock {
    return this._clock || systemClock;
  }

  /**
   * @property {Number} [warmupWindow=0] a timeout after startup (in ms) during which
   * no alerts are raised, irrespective of truthiness of the rule condition
   */
  get warmup(): number {
    return this.options.warmupWindow || 0;
  }

  set warmup(value: number) {
    this.options.warmupWindow = value;
    this._warmupEnd = value > 0 ? this.getTime() + value : 0;
  }

  /**
   * Returns true if this rule in an violated states.
   * @type {Boolean}
   */
  get isTriggered(): boolean {
    return this.violations > 0;
  }

  /**
   * Gets whether the we're currently in warm up phase
   * @type {Boolean}
   */
  get isWarmingUp(): boolean {
    return !!this._warmupEnd && this.getTime() < this._warmupEnd;
  }

  /**
   * The number of alerts raised for the current event
   * @type {Number}
   */
  get alertCount(): number {
    return this[ALERT_COUNT] || 0;
  }

  get isInAlertDelay(): boolean {
    return !!this._alertDelayEnd && this.getTime() < this._alertDelayEnd;
  }

  clear(): void {
    this._resetStart = 0;
    this._warmupEnd = 0;
    this._alertDelayEnd = 0;
    this[ALERT_COUNT] = 0;
    this.violations = 0;
    this.alertStart = null;
    this.updateRuleState(RuleState.NORMAL);
    this.clearResetTimer();
  }

  /**
   * Clean up all resource associated with the {@link Rule}
   */
  destroy(): void {
    this.stop();
  }

  private getTime(): number {
    return this.clock.getTime();
  }

  private startWarmup(): void {
    this._ruleState = RuleState.NORMAL;
    if (this.warmup > 0) {
      this._warmupEnd = this.getTime() + this.warmup;
    } else {
      this._warmupEnd = 0;
    }
  }

  private startAlertTimeout(): void {
    const triggerWindow = this.alertOptions?.triggerWindow ?? 0;
    this._alertDelayEnd = triggerWindow ? this.getTime() + triggerWindow : 0;
  }

  private onError(err: Error): void {}

  async handleResult(result: EvaluationResult): Promise<void> {
    if (this.skipCheck()) {
      return;
    }

    return result.success ? this.trigger(result) : this.reset(result);
  }

  start(clock: Clock): void {
    if (!this._started) {
      this._started = true;
      this._clock = clock;
      this.startWarmup();
    }
  }

  stop(): void {
    if (this._started) {
      this._started = false;
      this._warmupEnd = 0;
      this._alertDelayEnd = 0;
      this.clearListeners();
    }
    this.updateRuleState(RuleState.NORMAL);
    this.clearResetTimer();
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
      metric: clone(this.metric),
      condition: clone(this.condition),
      active: this.isActive,
      message: this.message,
      payload: clone(this.payload),
      channels: [...this.channels],
      severity: this.severity,
      lastAlertAt: this._lastAlertAt,
    };
  }

  private createAlert(
    event: RuleEventsEnum,
    result: EvaluationResult,
  ): RuleAlert {
    const { id, name, description, payload, alertStart: start } = this;
    const alert: RuleAlert = {
      id: getUniqueId(),
      event,
      errorLevel: result.errorLevel,
      start: this.alertStart,
      end: this._resetStart,
      threshold: this.condition?.errorThreshold ?? 0,
      value: this._triggerValue,
      violations: this.violations, // violations
      alerts: this.alertCount,
      state: { ...result.state },
      severity: this.severity,
    };
    if (event === RuleEventsEnum.ALERT_RESET) {
      alert.resetValue = result.value;
    }
    return alert;
  }

  private updateRuleState(state: RuleState) {
    if (this._ruleState !== state) {
      this._ruleState = state;
      this.emit(RuleEventsEnum.STATE_CHANGED, {
        state,
        ts: this.getTime(),
        rule: this,
      }).catch(this.onError);
    }
  }

  public onStateChange(handler: RuleStateChangeHandler): UnsubscribeFn {
    return this.on(RuleEventsEnum.STATE_CHANGED, handler);
  }

  protected notifyAlert(result: EvaluationResult): Promise<void> {
    const eventName = RuleEventsEnum.ALERT_TRIGGERED;
    const context = this.createAlert(eventName, result);
    return this.emit(eventName, context).finally(() => {
      this[ALERT_COUNT] = this.alertCount + 1;
      this._lastAlertAt = this.getTime();
    });
  }

  private async trigger(state: EvaluationResult): Promise<void> {
    if (!this.isTriggered) {
      this[ALERT_COUNT] = 0;
      this.violations = 0;
      this.startAlertTimeout();
      this.alertStart = this.getTime();
      this.updateRuleState(RuleState.ERROR);
    }
    this.clearResetTimer();

    this.violations = this.violations + 1;

    if (this.shouldRaiseAlert()) {
      return this.notifyAlert(state);
    }
  }

  private clearResetTimer(): void {
    if (this._resetTimer) {
      this._resetTimer.stop();
      this._resetTimer = null;
      this._resetStart = 0;
    }
  }

  private startResetTimer(result: EvaluationResult): void {
    const resetWindow = this.options.recoveryWindow || 0;
    const shouldAlert = !!this.options.alertOnReset;

    const clear = (): void => {
      this[ALERT_COUNT] = 0;
      this.violations = 0;
      this.updateRuleState(RuleState.NORMAL);
    };

    const run = (): void => {
      if (shouldAlert) {
        this.notifyReset(result)
          .finally(() => clear())
          .catch(this.onError);
      } else {
        clear();
      }
    };

    if (!resetWindow) {
      return run();
    }

    this.clearResetTimer();
    this._resetStart = this.getTime();
    const resetEnd = this._resetStart + resetWindow;

    this._resetTimer = createAccurateInterval(() => {
      const now = this.getTime();
      if (now >= resetEnd) {
        this.clearResetTimer();
        run();
      }
    }, 500);
  }

  protected notifyReset(result: EvaluationResult): Promise<void> {
    const eventName = RuleEventsEnum.ALERT_RESET;
    const context = this.createAlert(eventName, result);
    return this.emit(eventName, context);
  }

  /**
   * Resets the alert states for this rule
   * @private
   * @param {EvaluationResult} result results of evaluation
   * @return {Promise<void>}
   */
  private async reset(result: EvaluationResult): Promise<void> {
    if (this.isTriggered) {
      this.startResetTimer(result);
    } else {
      if (result.errorLevel === ErrorLevel.WARNING) {
        this.updateRuleState(RuleState.WARNING);
      }
    }
  }

  /**
   * Determines whether we should skip notifications
   * @type {Boolean}
   */
  private skipCheck(): boolean {
    return !this.isActive || this.isWarmingUp;
  }

  protected shouldRaiseAlert(): boolean {
    if (this.isInAlertDelay) return false;
    const { minViolations, maxAlertsPerEvent, renotifyInterval } = this.options;
    if (minViolations && this.violations < minViolations) {
      return false;
    }

    if (renotifyInterval && this._lastAlertAt) {
      const delta = this.getTime() - this._lastAlertAt;
      if (delta < renotifyInterval) {
        return false;
      }
    }

    if (maxAlertsPerEvent && this.alertCount >= maxAlertsPerEvent) {
      return false;
    }

    return true;
  }
}
