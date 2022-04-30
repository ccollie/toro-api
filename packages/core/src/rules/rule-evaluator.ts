import { Metric, MetricManager } from '../metrics';
import { Rule } from './rule';
import { parseRuleCondition } from './schemas';
import {
  ConditionEvaluator,
  PeakConditionEvaluator,
  ThresholdConditionEvaluator,
} from './condition-evaluator';
import { ChangeConditionEvaluator } from './change-condition-evaluator';
import { logger } from '../logger';
import {
  ChangeCondition,
  EvaluationResult,
  PeakCondition,
  RuleType,
  ThresholdCondition,
} from '../types';
import { DDSketch } from '@datadog/sketches-js';

export class RuleEvaluator {
  protected evaluator: ConditionEvaluator;
  public readonly rule: Rule;
  public readonly metric: Metric;

  constructor(rule: Rule, metric: Metric) {
    this.rule = rule;
    this.onError = this.onError.bind(this);
    this.metric = metric;
    this.evaluator = RuleEvaluator.createEvaluator(this.metric, rule);
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  destroy(): void {}

  private static createEvaluator(
    metric: Metric,
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

  async evaluate(
    manager: MetricManager,
    ts: number,
    value: number | DDSketch,
  ): Promise<EvaluationResult> {
    return this.evaluator.evaluate(manager, ts, value);
  }

  private onError(err: Error): void {
    logger.warn(err);
  }
}
