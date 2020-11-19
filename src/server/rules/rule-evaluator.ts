import { RealTimePeakDetector } from '../metrics/lib';
import { Clock, getStaticProp, isNumber, logger } from '../lib';
import {
  BaseMetric,
  ChangeAggregator,
  ChangeAggregatorOptions,
  createMetricFromJSON,
  MetricsListener,
} from '../metrics';
import {
  ChangeCondition,
  ErrorLevel,
  PeakCondition,
  PeakSignalDirection,
  RuleOperator,
  RuleType,
  ThresholdCondition,
} from '../../types';
import { EvaluationResult, Rule } from './rule';
import { UnsubscribeFn } from 'emittery';
import { parseRuleCondition } from './schemas';

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
  private readonly detector: RealTimePeakDetector;
  private readonly warningDetector: RealTimePeakDetector;
  private readonly direction: PeakSignalDirection;

  constructor(metric: BaseMetric, options: PeakCondition) {
    super(metric, { ...options, type: RuleType.THRESHOLD });
    const opts = {
      ...DefaultPeakDetectorOptions,
      ...options,
    };
    const clock = this.clock;
    this.detector = new RealTimePeakDetector(
      clock,
      opts.lag,
      opts.errorThreshold,
      opts.influence,
    );

    if (typeof opts.warningThreshold === 'number') {
      this.warningDetector = new RealTimePeakDetector(
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

export class ChangeConditionEvaluator extends ThresholdConditionEvaluator {
  private readonly aggregator: ChangeAggregator;
  private readonly ruleType: RuleType;

  constructor(metric: BaseMetric, options: ChangeCondition) {
    super(metric, { ...options, type: RuleType.THRESHOLD });
    this.ruleType = options.type;
    const aggregatorOptions: ChangeAggregatorOptions = {
      ...options,
      usePercentage: options.changeType === 'PCT',
    };
    this.aggregator = new ChangeAggregator(this.clock, aggregatorOptions);
  }

  protected handleEval(value: number): ErrorLevel {
    const change = this.aggregator.update(value);
    const result = super.handleEval(change);
    this.state['ruleType'] = this.ruleType;
    return result;
  }
}

export class RuleEvaluator {
  protected evaluator: ConditionEvaluator;
  private unsubscribe: UnsubscribeFn;
  private readonly listener: MetricsListener;
  public readonly rule: Rule;
  public metric: BaseMetric;

  constructor(rule: Rule, listener: MetricsListener) {
    this.rule = rule;
    this.listener = listener;
    this.onError = this.onError.bind(this);
    this.parseCondition();
  }

  destroy(): void {
    this.unsubscribe();
  }

  private get clock(): Clock {
    return this.listener.clock;
  }

  private getMetric(id: string): BaseMetric {
    return this.listener.metrics.find((x) => x.id === id);
  }

  private parseMetric(): BaseMetric {
    const opts = this.rule.metric;
    return this.getMetric(opts?.id) || createMetricFromJSON(this.clock, opts);
  }

  private createEvaluator(metric: BaseMetric): ConditionEvaluator {
    const condition = parseRuleCondition(this.rule.condition);

    switch (condition.type) {
      case RuleType.PEAK:
        return new PeakConditionEvaluator(metric, condition as PeakCondition);
      case RuleType.THRESHOLD:
        return new ThresholdConditionEvaluator(
          metric,
          condition as ThresholdCondition,
        );
      case RuleType.CHANGE:
        return new ChangeConditionEvaluator(
          metric,
          condition as ChangeCondition,
        );
    }
  }

  private parseCondition(): void {
    const metric = this.parseMetric();
    // todo: bail if metric is undefined
    this.evaluator = this.createEvaluator(metric);
    this.listener.registerMetric(metric);
    this.unsubscribe = metric.onUpdate(({ value }) => {
      this.evaluate(value).catch(this.onError);
    });
    this.metric = metric;
  }

  async evaluate(value: number): Promise<boolean> {
    if (!this.rule.isActive) {
      return false;
    }
    const result = this.evaluator.evaluate(value);
    await this.rule.handleResult(result);
    return result.success;
  }

  private onError(err: Error): void {
    logger.warn(err);
  }
}
