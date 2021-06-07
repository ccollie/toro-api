import boom from '@hapi/boom';
import {
  AccurateInterval,
  Clock,
  createAccurateInterval,
  getUniqueId,
  logger,
} from '../lib';
import {
  ErrorLevel,
  NotificationContext,
  RuleAlert,
  RuleEventsEnum,
  RuleState,
} from '../../types';
import {
  AlertData,
  CheckAlertResult,
  CircuitState,
  RuleScripts,
} from '../commands/rule-scripts';
import { Queue } from 'bullmq';
import { Rule } from './rule';
import handlebars from 'handlebars';
import { createRuleTemplateHelpers } from './rule-template-helpers';
import { QueueManager } from '../queues';
import { EvaluationResult } from './rule-evaluator';
import { NotificationManager } from '../notifications';

function isCircuitTripped(state: CircuitState): boolean {
  return state === CircuitState.HALF_OPEN || state === CircuitState.OPEN;
}

function getRuleState(result: EvaluationResult): RuleState {
  if (result.success) return RuleState.NORMAL;
  return result.errorLevel === ErrorLevel.WARNING
    ? RuleState.WARNING
    : RuleState.ERROR;
}

/**
 * A class responsible for generating alerts based on the evaluation of a metric value
 */
export class RuleAlerter {
  private _ruleState: RuleState | undefined;
  private _state: CircuitState = CircuitState.CLOSED;
  private _failures = 0;
  private _alertCount = 0;
  private _shouldNotify = false;
  private _alertId: string;
  private _alert: RuleAlert = null;
  /** The timestamp marking the end of the warmupWindow period */
  private _warmupEnd = 0;
  private _lastFailedAt = 0;
  private _resetTimer: AccurateInterval;
  private readonly clock: Clock;
  private readonly _baseContext: Record<string, any>;
  private _template: handlebars.TemplateDelegate;

  public readonly rule: Rule;
  public readonly notifications: NotificationManager; // public for testing
  private readonly queueManager: QueueManager;

  constructor(manager: QueueManager, rule: Rule, clock: Clock) {
    this.queueManager = manager;
    this.notifications = manager.hostManager.notifications;
    this.rule = rule;
    this.clock = clock;
    this._baseContext = this.createBaseContext(
      manager.hostManager.notificationContext,
    );
  }

  destroy(): void {
    this.clearResetTimer();
  }

  get queue(): Queue {
    return this.queueManager.queue;
  }

  get id(): string {
    return this.rule.id;
  }

  get isActive(): boolean {
    return this.rule.isActive;
  }

  get isWarmingUp(): boolean {
    return !!this._warmupEnd && this.getTime() < this._warmupEnd;
  }

  private get recoveryWindow(): number {
    return this.rule.alertOptions.recoveryWindow ?? 0;
  }

  private get timeSinceLastFailure(): number {
    return this._lastFailedAt ? this.getTime() - this._lastFailedAt : 0;
  }

  get isInCooldown(): boolean {
    const diff = this.timeSinceLastFailure;
    return diff && diff < this.recoveryWindow;
  }

  get failures(): number {
    return this._failures;
  }

  get alertCount(): number {
    return this._alertCount;
  }

  get state(): RuleState | undefined {
    return this._ruleState;
  }

  /**
   * Returns true if this rule in an violated states.
   * @type {Boolean}
   */
  get isTriggered(): boolean {
    return isCircuitTripped(this._state);
  }

  private clearState(): void {
    this._alertCount = 0;
    this._failures = 0;
    this._shouldNotify = false;
    this._state = CircuitState.CLOSED;
    this.rule.state = RuleState.NORMAL;
    this._alert = null;
    this._alertId = null;
  }

  async clear(): Promise<void> {
    this.clearResetTimer();
    await RuleScripts.clearAlertState(this.queue, this.rule.id);
    this.clearState();
  }

  private getTime(): number {
    return this.clock.getTime();
  }

  private static onError(err: Error): void {
    logger.warn(err);
  }

  // TODO: Move to rule-manager
  async start(): Promise<void> {
    await RuleScripts.startRule(this.queue, this.rule.id);
    this._ruleState = RuleState.NORMAL;
  }

  async stop(): Promise<void> {
    await RuleScripts.stopRule(this.queue, this.rule.id);
    this._ruleState = RuleState.MUTED;
  }

  protected updateLocalState(
    response: CheckAlertResult,
    result: EvaluationResult,
  ): void {
    this._state = response.state;
    this.rule.isActive = !['not_found', 'inactive'].includes(response.status);

    this._alertCount = response.alertCount ?? 0;
    this._failures = response.failures ?? 0;
    this._warmupEnd = response.status === 'warmup' ? response.endDelay ?? 0 : 0;

    this._shouldNotify = response.notify;
    this._ruleState = getRuleState(result);
    this._alertId = response.alertId;
    this.rule.state = this._ruleState;
    if (response.state === CircuitState.CLOSED) {
      this._lastFailedAt = 0;
    }

    if (!result.success && response.status === 'ok') {
      this.rule.totalFailures++;
    }
  }

  async handleResult(result: EvaluationResult): Promise<void> {
    if (!this.isActive || this.isWarmingUp) return;

    if (result.success) {
      if (this._ruleState === RuleState.NORMAL) return;
    }

    const wasTriggered = this.isTriggered;

    const now = this.clock.getTime();
    const response = await RuleScripts.checkAlert(
      this.queue,
      this.rule,
      result.errorLevel,
      now,
    );
    if (response.status === 'not_found') {
      const id = this.rule.id;
      throw boom.notFound(`Rule #${id} not found!`);
    }
    this.updateLocalState(response, result);

    // check to see if we need to write the alert
    if (response.status === 'ok' && !wasTriggered && this.isTriggered) {
      this._alert = await this.writeAlert(result);
      this._alertId = this._alert ? this._alert.id : '';
    } else if (!response.alertId) {
      this._alert = null;
    }

    if (result.success) {
      this.handleReset();
    } else {
      this._lastFailedAt = now;
      this.handleTrigger(result);
    }
    // cleanup current state. needs to be here since we rely on state
    // for notifications
    if (wasTriggered && !this.isTriggered) {
      this.clearState();
    }
  }

  private handleTrigger(result: EvaluationResult): void {
    this.notifyAlert(result);
  }

  private handleReset(): void {
    const alert = this._alert;

    if (!alert) return;

    const run = (): void => {
      this._alert = null;
      if (this.isTriggered) {
        alert.resetAt = this.clock.getTime();
        (alert as any).status = 'close';
        this.clear()
          .then(() => this.dispatchAlert(RuleEventsEnum.ALERT_RESET, alert))
          .catch(RuleAlerter.onError);
      }
    };

    if (!this.isInCooldown) {
      return run();
    }

    // It is possible for the rule state to be triggered followed by
    // a period of inactivity. We set a timeout so that if this happens
    // we automatically clear the alert

    this.clearResetTimer();

    this._resetTimer = createAccurateInterval(
      () => {
        if (!this.isInCooldown) {
          this.clearResetTimer();
          run();
        }
      },
      1000, // TODO: tune this interval based on size of diff
      { clock: this.clock },
    );
  }

  public createAlertData(result: EvaluationResult): AlertData {
    const alert: AlertData = {
      id: getUniqueId(),
      value: result.value,
      errorLevel: result.errorLevel,
      state: { ...result.state },
    };

    const templateData = {
      ...this._baseContext,
      ...alert,
    };

    alert.message = this.getAlertMessage(templateData);

    return alert;
  }

  protected async writeAlert(result: EvaluationResult): Promise<RuleAlert> {
    const data = this.createAlertData(result);
    return RuleScripts.writeAlert(this.queue, this.rule, data);
  }

  protected notifyAlert(result: EvaluationResult): void {
    const event = result.success
      ? RuleEventsEnum.ALERT_RESET
      : RuleEventsEnum.ALERT_TRIGGERED;
    if (!this._shouldNotify) return;
    this.dispatchAlert(event, this._alert).catch(RuleAlerter.onError);
  }

  protected async dispatchAlert(
    event: RuleEventsEnum,
    alert: RuleAlert,
  ): Promise<void> {
    if (!alert || !this.queueManager.hasLock) return;
    // by the time we get here, the alert is already stored in redis
    const channels = this.rule.channels || [];
    const templateData = {
      failures: this._failures,
      alertCount: this._alertCount,
      ...this._baseContext,
      ...alert,
    };

    await this.notifications.dispatch(event, templateData, channels);
    await this.markNotify(alert.id);
  }

  private async markNotify(alertId: string): Promise<void> {
    if (alertId) {
      await RuleScripts.markNotify(
        this.queue,
        this.rule,
        alertId,
        this.clock.getTime(),
      );
    }
  }

  private clearResetTimer(): void {
    if (this._resetTimer) {
      this._resetTimer.stop();
      this._resetTimer = null;
    }
  }

  get messageTemplate(): handlebars.TemplateDelegate {
    if (!this._template && this.rule.message) {
      this._template = handlebars.compile(this.rule.message);
    }
    return this._template;
  }

  private getAlertMessage(context: Record<string, any>): string {
    const template = this.messageTemplate;
    if (template) {
      const helpers = createRuleTemplateHelpers(context.event, context);
      return template(context, { helpers });
    }
    return null;
  }

  private createBaseContext(context: NotificationContext): Record<string, any> {
    const { id, name, prefix, uri } = this.queueManager;
    const queue = { name, prefix, id, uri };
    // todo: rule uri
    return {
      ...context,
      queue,
      rule: {
        id: this.rule.id,
        name: this.rule.name,
        description: this.rule.description,
      },
    };
  }
}
