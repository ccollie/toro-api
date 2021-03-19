import { Clock, logger } from '../lib';
import { BaseMetric, createMetricFromJSON, MetricsListener } from '../metrics';
import {
  ChangeCondition,
  PeakCondition,
  RuleType,
  ThresholdCondition,
} from '../../types';
import { Rule } from './rule';
import { UnsubscribeFn } from 'emittery';
import { parseRuleCondition } from './schemas';
import {
  ConditionEvaluator,
  PeakConditionEvaluator,
  ThresholdConditionEvaluator,
} from './condition-evaluator';
import { ChangeConditionEvaluator } from './change-condition-evaluator';

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
