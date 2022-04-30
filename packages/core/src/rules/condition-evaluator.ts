import { StreamingPeakDetector } from '../stats';
import { isNumber } from '@alpen/shared';
import {
  AggregationType,
  Metric,
  MetricGranularity,
  MetricManager,
  getSketchAggregateValue,
} from '../metrics';
import {
  ErrorStatus,
  EvaluationResult,
  PeakCondition,
  PeakSignalDirection,
  RuleEvaluationState,
  RuleOperator,
  RuleType,
  ThresholdCondition,
} from '../types';
import { TimeseriesValue } from '../commands/timeseries-list';
import ms from 'ms';
import { DDSketch } from '@datadog/sketches-js';

export interface ThresholdRuleEvaluationState extends RuleEvaluationState {}

export interface PeakRuleEvaluationState extends RuleEvaluationState {
  signal: number;
  direction: PeakSignalDirection;
}

export function isPeakRuleEvaluationState(
  arg: unknown,
): arg is PeakRuleEvaluationState {
  if (!arg) return false;
  const _arg = arg as any;
  return (
    _arg['ruleType'] === RuleType.PEAK &&
    typeof _arg['errorThreshold'] !== 'undefined'
  );
}

export function compare(operator: RuleOperator, a: number, b: number): boolean {
  switch (operator) {
    case RuleOperator.EQ:
      return a == b;
    case RuleOperator.NE:
      return a != b;
    case RuleOperator.GT:
      return a > b;
    case RuleOperator.GTE:
      return a >= b;
    case RuleOperator.LT:
      return a < b;
    case RuleOperator.LTE:
      return a <= b;
  }
  return false;
}

export class ConditionEvaluator {
  public readonly metric: Metric;
  protected unit: string;

  constructor(metric: Metric) {
    this.metric = metric;
    // todo: should unit be based on the aggregator rather than the metric ?
    this.unit = this.metric.unit;
  }

  async onMetricUpdate(
    manager: MetricManager,
    ts: number,
    value: number | DDSketch,
  ): Promise<ErrorStatus> {
    return ErrorStatus.NONE;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected handleEval(value: number, ts?: number): ErrorStatus {
    return ErrorStatus.NONE;
  }

  protected getState(level: ErrorStatus, value: number | DDSketch): RuleEvaluationState {
    return {
      errorThreshold: 0,
      unit: this.unit,
      errorLevel: level,
      ruleType: RuleType.THRESHOLD,
      comparator: RuleOperator.GT,
      value: (typeof value === 'number') ? value : undefined,
    };
  }

  async evaluate(
    manager: MetricManager,
    ts: number,
    value: number | DDSketch,
  ): Promise<EvaluationResult> {
    const notificationType = await this.onMetricUpdate(manager, ts, value);
    const triggered = notificationType !== ErrorStatus.NONE;
    return {
      value: typeof value === 'number' ? value : undefined,
      triggered,
      errorLevel: notificationType,
      state: this.getState(notificationType, value),
    };
  }
}

export class ThresholdConditionEvaluator extends ConditionEvaluator {
  public options: ThresholdCondition;

  constructor(metric: Metric, options: ThresholdCondition) {
    super(metric);
    this.options = options;
  }

  protected evaluateThreshold(value: number): ErrorStatus {
    const { operator, errorThreshold, warningThreshold } = this.options;

    if (compare(operator, value, errorThreshold)) {
      return ErrorStatus.ERROR;
    }

    if (
      isNumber(warningThreshold) &&
      compare(operator, value, warningThreshold)
    ) {
      return ErrorStatus.WARNING;
    }

    return ErrorStatus.NONE;
  }

  async onMetricUpdate(
    manager: MetricManager,
    ts: number,
    value: number | DDSketch,
  ): Promise<ErrorStatus> {
    if (typeof value !== 'number') {
      // ??? don't know about this
      value = getSketchAggregateValue(value, AggregationType.SUM);
    }
    return this.evaluateThreshold(value);
  }

  protected getState(level: ErrorStatus, value: number): RuleEvaluationState {
    const {
      errorThreshold,
      warningThreshold,
      operator: comparator,
    } = this.options;
    return {
      comparator,
      unit: this.unit,
      errorLevel: level,
      ruleType: RuleType.THRESHOLD,
      errorThreshold,
      warningThreshold,
      value,
    } as ThresholdRuleEvaluationState;
  }
}

const DefaultPeakDetectorOptions: PeakCondition = {
  type: RuleType.PEAK,
  deviations: 3.5,
  errorThreshold: 3.5,
  influence: 0.5,
  lag: 0,
  direction: PeakSignalDirection.BOTH,
  windowSize: ms('5 mins'),
};

class PeakConditionState {
  private readonly options: PeakCondition;
  private readonly threshold: number;
  private readonly detector: StreamingPeakDetector;
  private _signal: number;
  private lastTriggered?: number;
  triggerCount: number;
  total: number;

  constructor(options: PeakCondition, threshold: number) {
    const opts = {
      ...DefaultPeakDetectorOptions,
      ...options,
    };
    this.threshold = threshold;
    if (opts.lag && !opts.windowSize) {
      opts.windowSize = opts.lag;
    }
    this.options = opts;
    this.detector = new StreamingPeakDetector(
      opts.lag,
      opts.deviations,
      opts.influence,
    );
  }

  get direction(): PeakSignalDirection {
    return this.options.direction;
  }

  reset() {
    this.detector.reset();
    this.lastTriggered = undefined;
    this.triggerCount = 0;
    this.total = 0;
  }

  get signal(): number {
    return this._signal;
  }

  private signalValid(signal: number): boolean {
    switch (this.direction) {
      case PeakSignalDirection.ABOVE:
        return signal === 1;
      case PeakSignalDirection.BELOW:
        return signal === -1;
      case PeakSignalDirection.BOTH:
        return signal !== 0;
      default:
        return false;
    }
  }

  get triggerFraction(): number {
    const { total, triggerCount } = this;
    return total === 0 ? 0 : triggerCount / total;
  }

  get shouldTrigger(): boolean {
    return this.triggerFraction >= this.threshold;
  }

  update(value: number, ts: number): number {
    const { detector } = this;
    const errorSignal = detector.update(value, ts);
    this._signal = 0;
    if (!detector.isInLagPeriod) {
      this.total++;
      if (this.signalValid(errorSignal)) {
        this._signal = errorSignal;
        if (!this.lastTriggered) {
          this.lastTriggered = ts;
          this.triggerCount = 0;
        } else {
          const triggerWindow = this.options.triggerWindow;
          if (!triggerWindow || ts - this.lastTriggered > triggerWindow) {
            // really triggered
            this.triggerCount++;
          }
        }
      } else {
        this._signal = 0;
        this.triggerCount = 0;
        this.lastTriggered = undefined;
      }
    }

    return this._signal;
  }
}

export class PeakConditionEvaluator extends ConditionEvaluator {
  private readonly options: PeakCondition;
  private readonly errorState: PeakConditionState;
  private readonly warningState: PeakConditionState;
  private lastSignal = 0;

  constructor(metric: Metric, options: PeakCondition) {
    super(metric);
    const opts = {
      ...DefaultPeakDetectorOptions,
      ...options,
    };
    if (opts.lag && !opts.windowSize) {
      opts.windowSize = opts.lag;
    }
    this.options = opts;

    this.errorState = new PeakConditionState(
      this.options,
      options.errorThreshold,
    );
    if (typeof opts.warningThreshold === 'number') {
      this.warningState = new PeakConditionState(
        options,
        opts.warningThreshold,
      );
    } else {
      this.warningState = null;
    }
  }

  get direction(): PeakSignalDirection {
    return this.options.direction;
  }

  private reset() {
    this.errorState.reset();
    this.warningState?.reset();
  }

  protected getState(
    level: ErrorStatus,
    value: number,
  ): PeakRuleEvaluationState {
    const baseState = super.getState(level, value);
    const { errorThreshold, warningThreshold } = this.options;
    return {
      ...baseState,
      errorThreshold,
      warningThreshold,
      ruleType: RuleType.PEAK,
      signal: this.lastSignal,
      direction: this.direction,
    };
  }

  protected async getData(
    manager: MetricManager,
    ts: number,
    aggregation?: AggregationType,
  ): Promise<TimeseriesValue<number>[]> {
    const { lag, windowSize } = this.options;
    const { metric } = this;
    const start = ts - lag - (windowSize || lag);
    // todo: calculate unit. for now use minute
    const unit = MetricGranularity.Minute;
    return manager.getMetricScalarValues(metric, unit, start, ts, aggregation);
  }

  async onMetricUpdate(
    manager: MetricManager,
    ts: number,
    value: number | DDSketch,
  ): Promise<ErrorStatus> {
    this.reset();
    const data = await this.getData(manager, ts);
    // todo: checkout  https://docs.datadoghq.com/monitors/create/types/metric/?tab=threshold
    // about requiring full windows. Also handle triggerWindow etc

    for (let i = 0; i < data.length; i++) {
      const { timestamp, value } = data[i];
      this.errorState.update(value, timestamp);
      // independent of whether an error is encountered, we have to
      // update the warning detector if it exists
      this.warningState?.update(value, timestamp);
    }

    if (this.errorState.shouldTrigger) {
      this.lastSignal = this.errorState.signal;
      return ErrorStatus.ERROR;
    }

    if (this.warningState?.shouldTrigger) {
      this.lastSignal = this.warningState.signal;
      return ErrorStatus.WARNING;
    }

    return ErrorStatus.NONE;
  }
}
