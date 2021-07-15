import { StreamingPeakDetector } from '../stats';
import { Clock, getStaticProp, isNumber } from '../lib';
import { BaseMetric } from '../metrics';
import {
  ErrorLevel,
  EvaluationResult,
  PeakCondition,
  PeakRuleEvaluationState,
  PeakSignalDirection,
  RuleEvaluationState,
  RuleOperator,
  RuleType,
  ThresholdCondition,
  ThresholdRuleEvaluationState,
} from '../../types';

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
  public readonly metric: BaseMetric;
  protected unit: string;

  constructor(metric: BaseMetric) {
    this.metric = metric;
    // todo: should unit be based on the aggregator rather than the metric ?
    this.unit = getStaticProp(this.metric, 'unit');
  }

  protected get clock(): Clock {
    return this.metric.clock;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected handleEval(value: number): ErrorLevel {
    return ErrorLevel.NONE;
  }

  protected getState(level: ErrorLevel, value: number): RuleEvaluationState {
    return {
      errorThreshold: 0,
      unit: this.unit,
      errorLevel: level,
      ruleType: RuleType.THRESHOLD,
      comparator: RuleOperator.GT,
      value,
    };
  }

  evaluate(value: number): EvaluationResult {
    const notificationType = this.handleEval(value);
    const triggered = notificationType !== ErrorLevel.NONE;
    return {
      value,
      triggered,
      errorLevel: notificationType,
      state: this.getState(notificationType, value),
    };
  }
}

export class ThresholdConditionEvaluator extends ConditionEvaluator {
  public options: ThresholdCondition;

  constructor(metric: BaseMetric, options: ThresholdCondition) {
    super(metric);
    this.options = options;
  }

  protected handleEval(value: number): ErrorLevel {
    const { operator, errorThreshold, warningThreshold } = this.options;

    if (compare(operator, value, errorThreshold)) {
      return ErrorLevel.CRITICAL;
    }

    if (
      isNumber(warningThreshold) &&
      compare(operator, value, warningThreshold)
    ) {
      return ErrorLevel.WARNING;
    }

    return ErrorLevel.NONE;
  }

  protected getState(level: ErrorLevel, value: number): RuleEvaluationState {
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
  errorThreshold: 3.5,
  influence: 0.5,
  lag: 0,
  direction: PeakSignalDirection.BOTH,
};

export class PeakConditionEvaluator extends ConditionEvaluator {
  private readonly detector: StreamingPeakDetector;
  private readonly warningDetector: StreamingPeakDetector;
  private readonly direction: PeakSignalDirection;
  private readonly options: PeakCondition;
  private lastSignal = 0;

  constructor(metric: BaseMetric, options: PeakCondition) {
    super(metric);
    const opts = {
      ...DefaultPeakDetectorOptions,
      ...options,
    };
    this.options = opts;
    const clock = this.clock;
    this.detector = new StreamingPeakDetector(
      clock,
      opts.lag,
      opts.errorThreshold,
      opts.influence,
    );

    if (typeof opts.warningThreshold === 'number') {
      this.warningDetector = new StreamingPeakDetector(
        clock,
        opts.lag,
        opts.warningThreshold,
        opts.influence,
      );
    } else {
      this.warningDetector = null;
    }

    this.direction = opts.direction;
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

  protected getState(
    level: ErrorLevel,
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

  protected handleEval(value: number): ErrorLevel {
    const errorSignal = this.detector.update(value);
    // independent of whether an error is encountered, we have to
    // update the warning detector if it exists
    const warningSignal =
      (this.warningDetector && this.warningDetector.update(value)) ?? 0;

    if (this.signalValid(errorSignal)) {
      this.lastSignal = errorSignal;
      return ErrorLevel.CRITICAL;
    }

    if (this.signalValid(warningSignal)) {
      this.lastSignal = errorSignal;
      return ErrorLevel.WARNING;
    }

    return ErrorLevel.NONE;
  }
}
