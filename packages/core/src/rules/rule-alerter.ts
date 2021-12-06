import { notFound } from '@hapi/boom';
import { Queue } from 'bullmq';
import { compile, TemplateDelegate } from 'handlebars';
import { round } from 'lodash';
import ms from 'ms';
import {
  AlertData,
  CheckAlertResult,
  CircuitState,
  RuleScripts,
} from '../commands';
import {
  AccurateInterval,
  Clock,
  createAccurateInterval,
  getUniqueId,
} from '../lib';
import { logger } from '../logger';
import { NotificationContext, NotificationManager } from '../notifications';
import { QueueManager } from '../queues';
import {
  ChangeRuleEvaluationState,
  isChangeRuleEvaluationState,
} from './change-condition-evaluator';
import {
  EvaluationResult,
  isPeakRuleEvaluationState,
  RuleEvaluationState,
} from './condition-evaluator';
import { Rule } from './rule';
import { RuleAlert } from './rule-alert';
import {
  ChangeAggregationType,
  ChangeTypeEnum,
  RuleOperator,
  RuleType,
} from './rule-conditions';
import { createRuleTemplateHelpers } from './rule-template-helpers';
import { ErrorLevel, RuleEventsEnum, RuleState } from './types';

function isCircuitTripped(state: CircuitState): boolean {
  return state === CircuitState.HALF_OPEN || state === CircuitState.OPEN;
}

function getRuleState(result: EvaluationResult): RuleState {
  if (!result.triggered) return RuleState.NORMAL;
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
  private _template: TemplateDelegate;

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

    if (result.triggered && response.status === 'ok') {
      this.rule.totalFailures++;
    }
  }

  async handleResult(result: EvaluationResult): Promise<void> {
    if (!this.isActive || this.isWarmingUp) return;

    if (!result.triggered) {
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
      throw notFound(`Rule #${id} not found!`);
    }
    this.updateLocalState(response, result);

    // check to see if we need to write the alert
    if (response.status === 'ok' && !wasTriggered && this.isTriggered) {
      this._alert = await this.writeAlert(result);
      this._alertId = this._alert ? this._alert.id : '';
    } else if (!response.alertId) {
      this._alert = null;
    }

    if (!result.triggered) {
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
    if (!alert.message) alert.message = describeResult(result.state);
    alert.title = result.triggered ? getAlertTitle(result.state) : '';

    return alert;
  }

  protected async writeAlert(result: EvaluationResult): Promise<RuleAlert> {
    const data = this.createAlertData(result);
    const host = this.queueManager.host;
    return RuleScripts.writeAlert(host, this.queue, this.rule, data);
  }

  protected notifyAlert(result: EvaluationResult): void {
    const event = result.triggered
      ? RuleEventsEnum.ALERT_TRIGGERED
      : RuleEventsEnum.ALERT_RESET;
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

  get messageTemplate(): TemplateDelegate {
    if (!this._template && this.rule.message) {
      this._template = compile(this.rule.message);
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

export const OperatorNames = {
  short: {
    [RuleOperator.EQ]: '==',
    [RuleOperator.NE]: '!=',
    [RuleOperator.LT]: '<',
    [RuleOperator.LTE]: '<=',
    [RuleOperator.GT]: '>',
    [RuleOperator.GTE]: '>=',
  },
  long: {
    [RuleOperator.EQ]: 'is equal to',
    [RuleOperator.NE]: 'is not equal to',
    [RuleOperator.LT]: 'falls below',
    [RuleOperator.LTE]: 'is less than or equal to',
    [RuleOperator.GT]: 'exceeds',
    [RuleOperator.GTE]: 'is greater than or equal to',
  },
};

// exported for testing
export function getAlertTitle(state: RuleEvaluationState): string {
  const { comparator: operator, ruleType } = state;
  switch (ruleType) {
    case RuleType.CHANGE:
      const changeState = state as ChangeRuleEvaluationState;
      let operatorText: string;
      switch (operator) {
        case RuleOperator.EQ:
          operatorText = 'matches';
          break;
        case RuleOperator.NE:
          operatorText = 'does not match';
          break;
        case RuleOperator.GT:
        case RuleOperator.GTE:
        case RuleOperator.LT:
        case RuleOperator.LTE:
          operatorText = 'exceeds';
          break;
      }
      const aggregationText = getChangeAggregationString(
        changeState.aggregation,
      );
      const strChangeType =
        changeState.changeType === ChangeTypeEnum.PCT ? '% change' : 'change';
      const windowDescription = ms(changeState.windowSize);
      return (
        `The ${aggregationText} of the ${strChangeType} over ${windowDescription} ` +
        `${operatorText} a threshold`
      );
    case RuleType.PEAK:
      return 'Spike detected';
    case RuleType.THRESHOLD:
      if (operator === RuleOperator.EQ) {
        return 'Value matches a threshold';
      }
      if (operator === RuleOperator.NE) {
        return 'Metric value does not match a preset';
      }
      if (
        [
          RuleOperator.GT,
          RuleOperator.GTE,
          RuleOperator.LT,
          RuleOperator.LTE,
        ].includes(operator)
      ) {
        return 'Value exceeded a threshold';
      }
      break;
  }
  return '';
}

export function describeResult(state: RuleEvaluationState): string {
  const { value, unit } = state;
  const threshold = getThreshold(state);

  if (isPeakRuleEvaluationState(state)) {
    const strThreshold = formatValue(threshold, 'std dev', 1);
    const action =
      `peaked ${strThreshold} ` + (state.signal > 0 ? 'above' : 'below');
    const strValue = formatValue(value, unit);
    return `${strValue} ${action} the mean`;
  } else if (isChangeRuleEvaluationState(state)) {
    const strThreshold = formatValue(threshold, unit);
    const aggregationText = getChangeAggregationString(state.aggregation);
    const strChangeType =
      state.changeType === ChangeTypeEnum.PCT ? '% change' : 'change';
    const windowDescription = ms(state.windowSize);
    const lookbackDescription = ms(state.timeShift);
    const operatorText = OperatorNames.long[state.comparator];
    return (
      `The ${aggregationText} of the ${strChangeType} over ${windowDescription} compared to ` +
      `${lookbackDescription} ${operatorText} ${strThreshold}`
    );
  }
  const strThreshold = formatValue(threshold);
  const strValue = formatValue(value, unit);
  const operatorText = OperatorNames.long[state.comparator];
  return `The value of ${strValue} ${operatorText} the threshold of ${strThreshold}`;
}

function getThreshold(state: RuleEvaluationState): number {
  return state.errorLevel === ErrorLevel.WARNING
    ? state.warningThreshold
    : state.errorThreshold;
}

function hasFraction(val: number): boolean {
  return val !== Math.floor(val);
}

function formatValue(value: number, unit = '', places = 3): string {
  let result = '';
  if (hasFraction(value)) {
    value = round(value, places); // ?????
  }
  result = `${value}`;
  if (unit) result += ` ${unit}`;
  return result;
}

function getChangeAggregationString(agg: ChangeAggregationType): string {
  switch (agg) {
    case ChangeAggregationType.AVG:
      return 'average';
    case ChangeAggregationType.MAX:
      return 'maximum';
    case ChangeAggregationType.MIN:
      return 'minimum';
    case ChangeAggregationType.P90:
      return '90th percentile';
    case ChangeAggregationType.P95:
      return '95th percentile';
    case ChangeAggregationType.P99:
      return '99th percentile';
    case ChangeAggregationType.SUM:
      return 'total';
  }
}
