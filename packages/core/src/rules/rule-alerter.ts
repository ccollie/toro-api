import { Queue } from 'bullmq';
import { compile, TemplateDelegate } from 'handlebars';
import { round } from '@alpen/shared';
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
import type { NotificationContext } from '../types';
import { NotificationManager } from '../notifications';
import { QueueManager } from '../queues';
import {
  ChangeTypeEnum,
  ErrorStatus,
  EvaluationResult,
  RuleAlert,
  RuleEvaluationState,
  RuleEventsEnum,
  RuleOperator,
  RuleState,
  RuleType,
} from '../types';
import {
  ChangeRuleEvaluationState,
  isChangeRuleEvaluationState,
} from './change-condition-evaluator';
import { isPeakRuleEvaluationState } from './condition-evaluator';
import { Rule } from './rule';
import { createRuleTemplateHelpers } from './rule-template-helpers';
import { AggregationType } from '../metrics';

function isCircuitTripped(state: CircuitState): boolean {
  return state === CircuitState.HALF_OPEN || state === CircuitState.OPEN;
}

/**
 * A class responsible for generating alerts based on the evaluation of a metric value
 */
export class RuleAlerter {
  private _ruleState: RuleState | undefined;
  private _state: CircuitState = CircuitState.CLOSED;
  private _failures = 0;
  private _alertCount = 0;
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
   * Returns true if this rule in a violated state.
   * @type {Boolean}
   */
  get isTriggered(): boolean {
    return isCircuitTripped(this._state);
  }

  private clearState(): void {
    this._alertCount = 0;
    this._failures = 0;
    this._state = CircuitState.CLOSED;
    this.rule.state = RuleState.NORMAL;
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
    await RuleScripts.activateRule(this.queue, this.rule.id);
    this._ruleState = RuleState.NORMAL;
  }

  async stop(): Promise<void> {
    await RuleScripts.deactivateRule(this.queue, this.rule.id);
    this._ruleState = RuleState.MUTED;
  }

  protected updateLocalState(
    response: CheckAlertResult,
    result: EvaluationResult,
  ): void {
    this._state = response.state;
    this.rule.isActive = response.status === 'active';

    this._alertCount = response.alertCount ?? 0;
    this._failures = response.failures ?? 0;

    if (response.status === 'inactive') {
      this.rule.state = RuleState.MUTED;
    } else {
      if (
        response.state === CircuitState.OPEN ||
        response.state === CircuitState.HALF_OPEN
      ) {
        const status = response.errorStatus || result.errorLevel;
        this.rule.state =
          status === ErrorStatus.ERROR ? RuleState.ERROR : RuleState.WARNING;
      } else {
        this.rule.state = RuleState.NORMAL;
      }
    }

    this._ruleState = this.rule.state;

    if (result.triggered && response.status === 'active') {
      this.rule.totalFailures++;
    }
  }

  async handleResult(result: EvaluationResult): Promise<void> {
    if (!this.isActive) return;

    if (!result.triggered) {
      if (this._ruleState === RuleState.NORMAL) return;
    }

    const now = this.clock.getTime();
    const alertData = this.createAlertData(result);

    const response = await RuleScripts.checkAlert(
      this.queue,
      this.rule,
      alertData,
      now,
    );
    // if (response.status === 'not_found') {
    //   const id = this.rule.id;
    //   throw notFound(`Rule #${id} not found!`);
    // }
    this.updateLocalState(response, result);

    if (response.state === CircuitState.CLOSED && !response.changed) {
      // we're golden.
      return;
    }

    this.handleNotify(response);
  }

  private async getAlert(alertId: string): Promise<RuleAlert | null> {
    let alert: RuleAlert;
    try {
      alert = await RuleScripts.getAlert(this.queue, this.rule, alertId);
      return alert;
    } catch (e) {
      logger.error(e);
      return;
    }
  }

  private handleNotify(response: CheckAlertResult): void {
    if (!response.alertId) return;

    if (!response.notify && (response.earliestNotification ?? 0) == 0) {
      return;
    }

    const triggered = response.state === CircuitState.OPEN;
    const event = triggered
      ? RuleEventsEnum.ALERT_TRIGGERED
      : RuleEventsEnum.ALERT_RESET;

    const run = (): void => {
      this.clearResetTimer();
      const chain = triggered ? this.clear() : Promise.resolve();
      chain
        .then(() => {
          const data = Object.create(null);
          data.failures = response.failures;
          data.alertCount = response.alertCount;
          return this.dispatchAlert(event, response.alertId, data);
        })
        .catch(RuleAlerter.onError);
    };

    // It is possible for the rule state to be triggered followed by
    // a period of inactivity. We set a timeout so that if this happens
    // we automatically clear the alert
    this.clearResetTimer();

    if (response.earliestNotification) {
      const timeout = (response.earliestNotification ?? 0) - this.getTime();
      if (timeout <= 0) {
        return run();
      } else {
        this._resetTimer = createAccurateInterval(run, timeout, {
          clock: this.clock,
        });
      }
    } else {
      run();
    }
  }

  public createAlertData(result: EvaluationResult): AlertData {
    const alert: AlertData = {
      id: getUniqueId(),
      value: result.value,
      errorStatus: result.errorLevel,
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

  protected async dispatchAlert(
    event: RuleEventsEnum,
    alertId: string,
    data?: Record<string, any>,
  ): Promise<void> {
    if (!this.queueManager.hasLock) return;

    const alert = await this.getAlert(alertId);
    if (!alert) return;
    data = data ?? {};
    // by the time we get here, the alert is already stored in redis
    const channels = this.rule.channels || [];
    const templateData = {
      ...data,
      ...this._baseContext,
      ...alert,
    };

    await this.notifications.dispatch(event, templateData, channels);
    await this.markNotify(alert.id);
  }

  private async markNotify(alertId: string): Promise<void> {
    if (alertId) {
      await RuleScripts.markNotify(this.queue, this.rule, alertId);
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
  return state.errorLevel === ErrorStatus.WARNING
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

function getChangeAggregationString(agg: AggregationType): string {
  switch (agg) {
    case AggregationType.COUNT:
      return 'count';
    case AggregationType.AVG:
      return 'average';
    case AggregationType.MAX:
      return 'maximum';
    case AggregationType.MIN:
      return 'minimum';
    case AggregationType.P90:
      return '90th percentile';
    case AggregationType.P95:
      return '95th percentile';
    case AggregationType.P99:
      return '99th percentile';
    case AggregationType.SUM:
      return 'total';
    case AggregationType.LATEST:
      return 'latest';
  }
}
