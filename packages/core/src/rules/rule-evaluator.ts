import { BaseMetric } from '../metrics';
import { Rule } from './rule';
import { parseRuleCondition } from './schemas';
import {
  ConditionEvaluator,
  EvaluationResult,
  PeakConditionEvaluator,
  ThresholdConditionEvaluator,
} from './condition-evaluator';
import { ChangeConditionEvaluator } from './change-condition-evaluator';
import { logger } from '../logger';
import {
  ChangeCondition,
  PeakCondition,
  RuleType,
  ThresholdCondition,
} from './rule-conditions';

export class RuleEvaluator {
  protected evaluator: ConditionEvaluator;
  public readonly rule: Rule;
  public readonly metric: BaseMetric;

  constructor(rule: Rule, metric: BaseMetric) {
    this.rule = rule;
    this.onError = this.onError.bind(this);
    this.metric = metric;
    this.evaluator = RuleEvaluator.createEvaluator(this.metric, rule);
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  destroy(): void {}

  private static createEvaluator(
    metric: BaseMetric,
    rule: Rule,
  ): ConditionEvaluator {
    const condition = parseRuleCondition(rule.condition);

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

  evaluate(value: number, ts?: number): EvaluationResult {
    return this.evaluator.evaluate(value, ts);
  }

  private onError(err: Error): void {
    logger.warn(err);
  }
}
