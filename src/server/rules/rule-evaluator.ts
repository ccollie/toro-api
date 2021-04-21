import { logger } from '../lib';
import { BaseMetric, MetricsListener } from '../metrics';
import {
  ChangeCondition,
  ErrorLevel,
  PeakCondition,
  RuleType,
  ThresholdCondition,
} from '../../types';
import { Rule } from './rule';
import { parseRuleCondition } from './schemas';
import {
  ConditionEvaluator,
  PeakConditionEvaluator,
  ThresholdConditionEvaluator,
} from './condition-evaluator';
import { ChangeConditionEvaluator } from './change-condition-evaluator';

export interface EvaluationResult {
  value: number;
  success: boolean;
  errorLevel: ErrorLevel;
  state: Record<string, any>;
}

export class RuleEvaluator {
  private readonly unsubscribe: () => void;
  protected evaluator: ConditionEvaluator;
  public readonly rule: Rule;
  public readonly metric: BaseMetric;

  constructor(rule: Rule, listener: MetricsListener) {
    this.rule = rule;
    this.onError = this.onError.bind(this);
    let metric = listener.findMetricById(rule.metric.id);
    if (!metric) {
      metric = listener.registerMetricFromJSON(rule.metric);
      this.unsubscribe = () => {
        listener.unregisterMetric(metric);
        metric.destroy();
      };
    } else {
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      this.unsubscribe = () => {};
    }
    this.metric = metric;
    // todo: bail if metric is undefined
    this.evaluator = this.createEvaluator(this.metric);
  }

  destroy(): void {
    this.unsubscribe();
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

  evaluate(value: number): EvaluationResult {
    return this.evaluator.evaluate(value);
  }

  private onError(err: Error): void {
    logger.warn(err);
  }
}
