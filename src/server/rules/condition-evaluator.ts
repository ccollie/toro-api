import { StreamingPeakDetector } from '../stats';
import { Clock, getStaticProp, isNumber } from '../lib';
import { BaseMetric } from '../metrics';
import {
  ErrorLevel,
  PeakCondition,
  PeakSignalDirection,
  RuleOperator,
  RuleType,
  ThresholdCondition,
} from '../../types';
import { UnsubscribeFn } from 'emittery';
import { EvaluationResult } from './rule-evaluator';

export const OperatorNames = {
  short: {
    [RuleOperator.eq]: '==',
    [RuleOperator.ne]: '!=',
    [RuleOperator.lt]: '<',
    [RuleOperator.lte]: '<=',
    [RuleOperator.gt]: '>',
    [RuleOperator.gte]: '>=',
  },
  long: {
    [RuleOperator.eq]: 'is equal to',
    [RuleOperator.ne]: 'is not equal to',
    [RuleOperator.lt]: 'falls below',
    [RuleOperator.lte]: 'is less than or equal to',
    [RuleOperator.gt]: 'exceeds',
    [RuleOperator.gte]: 'is greater than or equal to',
  },
};

export function compare(operator: RuleOperator, a: number, b: number): boolean {
  switch (operator) {
    case RuleOperator.eq:
      return a == b;
    case RuleOperator.ne:
      return a != b;
    case RuleOperator.gt:
      return a > b;
    case RuleOperator.gte:
      return a >= b;
    case RuleOperator.lt:
      return a < b;
    case RuleOperator.lte:
      return a <= b;
  }
  return false;
}

export class ConditionEvaluator {
  public readonly metric: BaseMetric;
  private readonly unsubscribe: UnsubscribeFn;
  public readonly state: Record<string, any>;

  constructor(metric: BaseMetric) {
    this.metric = metric;
    this.state = Object.create(null);
  }

  destroy(): void {
    this.unsubscribe();
  }

  protected get clock(): Clock {
    return this.metric.clock;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  protected handleEval(value: number): ErrorLevel {
    return ErrorLevel.NONE;
  }

  evaluate(value: number): EvaluationResult {
    const notificationType = this.handleEval(value);
    const success = notificationType !== ErrorLevel.NONE;
    this.state['errorLevel'] = notificationType;
    return {
      value,
      success,
      errorLevel: notificationType,
      state: this.state,
    };
  }
}

export class ThresholdConditionEvaluator extends ConditionEvaluator {
  public options: ThresholdCondition;

  constructor(metric: BaseMetric, options: ThresholdCondition) {
    super(metric);
    this.options = options;
    this.state['unit'] = getStaticProp(this.metric, 'unit');
    this.state['ruleType'] = RuleType.THRESHOLD;
  }

  protected evaluateThreshold(value: number): ErrorLevel {
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

  protected handleEval(value: number): ErrorLevel {
    const level = this.evaluateThreshold(value);
    this.state['value'] = value;
    this.state['threshold'] = this.options.errorThreshold;
    this.state['warn_threshold'] = this.options.warningThreshold;
    this.state['comparator'] = OperatorNames.short[this.options.operator];
    return level;
  }
}

const DefaultPeakDetectorOptions: PeakCondition = {
  type: RuleType.PEAK,
  errorThreshold: 3.5,
  influence: 0.5,
  lag: 0,
  direction: PeakSignalDirection.BOTH,
  operator: RuleOperator.gt,
};

export class PeakConditionEvaluator extends ThresholdConditionEvaluator {
  private readonly detector: StreamingPeakDetector;
  private readonly warningDetector: StreamingPeakDetector;
  private readonly direction: PeakSignalDirection;

  constructor(metric: BaseMetric, options: PeakCondition) {
    super(metric, { ...options, type: RuleType.THRESHOLD });
    const opts = {
      ...DefaultPeakDetectorOptions,
      ...options,
    };
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

    this.direction = options.direction;
    this.state['ruleType'] = RuleType.PEAK;
    this.state['unit'] = 'std_dev';
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

  protected evaluateThreshold(value: number): ErrorLevel {
    const errorSignal = this.detector.update(value);
    // independent of whether an error is encountered, we have to
    // update the warning detector if it exists
    const warningSignal =
      (this.warningDetector && this.warningDetector.update(value)) ?? 0;

    if (this.signalValid(errorSignal)) {
      this.state['signal'] = errorSignal;
      this.state['direction'] = this.direction;
      return ErrorLevel.CRITICAL;
    }

    if (this.signalValid(warningSignal)) {
      this.state['signal'] = warningSignal;
      this.state['direction'] = this.direction;
      return ErrorLevel.WARNING;
    }

    return ErrorLevel.NONE;
  }
}
