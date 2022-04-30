import {
  AggregateFunction,
  AggregationType,
  getAggregateFunction,
  Metric,
  MetricManager,
} from '../metrics';
import Joi, { ObjectSchema } from 'joi';
import { DurationSchema } from '../validation';
import { calculateInterval, getUnitFromDuration } from '../metrics/utils';
import {
  ThresholdConditionEvaluator,
  ThresholdRuleEvaluationState,
} from './condition-evaluator';
import {
  ChangeConditionOptions,
  ChangeTypeEnum,
  ErrorStatus,
  RuleEvaluationState,
  RuleType,
} from '../types';
import ms from 'ms';
import { DDSketch } from '@datadog/sketches-js';

export interface ChangeRuleEvaluationState
  extends ThresholdRuleEvaluationState {
  windowSize: number;
  timeShift: number;
  changeType: ChangeTypeEnum;
  aggregation: AggregationType;
}

export function isChangeRuleEvaluationState(
  arg: unknown,
): arg is ChangeRuleEvaluationState {
  if (!arg) return false;
  const _arg = arg as any;
  return (
    _arg['ruleType'] === RuleType.CHANGE &&
    ['errorThreshold', 'windowSize', 'timeShift'].every(
      (field) => _arg[field] !== undefined,
    )
  );
}

const optionsSchema = Joi.object().keys({
  windowSize: DurationSchema,
  timeShift: DurationSchema.optional(),
  sampleInterval: DurationSchema.optional(),
  changeType: Joi.string()
    .valid(ChangeTypeEnum.CHANGE, ChangeTypeEnum.PCT)
    .default(ChangeTypeEnum.CHANGE),
  aggregationType: Joi.string()
    .valid(
      AggregationType.AVG,
      AggregationType.MIN,
      AggregationType.MAX,
      AggregationType.P90,
      AggregationType.P95,
      AggregationType.P99,
      AggregationType.SUM,
    )
    .default(AggregationType.AVG),
});

export class ChangeConditionEvaluator extends ThresholdConditionEvaluator {
  private _isFullWindow = false;
  private readonly aggregationType: AggregationType;
  private readonly calculationMethod: AggregateFunction;

  public readonly windowSize: number;
  public readonly timeShift: number;
  public readonly fullWindow: number;
  public readonly sampleInterval: number;
  public readonly usePercentage: boolean;

  constructor(metric: Metric, options: ChangeConditionOptions) {
    super(metric, { ...options, type: RuleType.THRESHOLD });
    const { timeShift = 0, windowSize, sampleInterval } = options;

    this.windowSize = windowSize;
    // TODO: validate sampleInterval
    this.sampleInterval = sampleInterval ?? calculateInterval(windowSize);
    this.timeShift = timeShift ?? windowSize;
    this.fullWindow = 2 * windowSize + timeShift;
    this.calculationMethod = getAggregateFunction(options.aggregationType);
    this.aggregationType = options.aggregationType;
    this.usePercentage = options.changeType === ChangeTypeEnum.CHANGE;
    if (windowSize < 60000) {
      throw new RangeError(
        'Windowsize cannot be less than 1m. Got ' + ms(windowSize),
      );
    }
  }

  protected getState(level: ErrorStatus, value: number): RuleEvaluationState {
    const baseState = super.getState(level, value);
    return {
      ...baseState,
      ruleType: RuleType.CHANGE,
      changeType: this.usePercentage
        ? ChangeTypeEnum.PCT
        : ChangeTypeEnum.CHANGE,
      windowSize: this.windowSize,
      timeShift: this.timeShift,
      aggregation: this.aggregationType,
    } as ChangeRuleEvaluationState;
  }

  public isFullWindow(ts: number): boolean {
    if (this._isFullWindow) return true;
    // TODO !!!
    return false;
  }

  private calcCurrentWindowStart(ts: number): number {
    return this.align(ts - this.windowSize);
  }

  private calcPreviousWindowStart(ts: number): number {
    const start = ts - this.timeShift - this.windowSize;
    return this.align(start);
  }

  private align(ts: number): number {
    return ts - (ts % this.sampleInterval);
  }

  async loadNormalizedRange(
    manager: MetricManager,
    start: number,
  ): Promise<number[]> {
    const { metric, windowSize, aggregationType } = this;
    const unit = getUnitFromDuration(windowSize);
    const result = [];
    start = this.align(start);
    const end = start + this.windowSize - 1;
    const interval = this.sampleInterval; // interval from unit

    const range = await manager.getMetricScalarValues(
      metric,
      unit,
      start,
      end,
      aggregationType,
    );

    // It _is_ expected that we can generate sparse arrays here
    range.forEach(({ timestamp, value }) => {
      const normalizedTs = (timestamp - start) / interval;
      result[normalizedTs] = value;
    });
    return result;
  }

  async loadDiffs(manager: MetricManager, ts: number): Promise<number[]> {
    const { usePercentage } = this;
    const prevStart = this.calcPreviousWindowStart(ts);
    const currStart = this.calcCurrentWindowStart(ts);

    const [previous, current] = await Promise.all([
      this.loadNormalizedRange(manager, prevStart),
      this.loadNormalizedRange(manager, currStart),
    ]);

    // TODO: have param for default value
    const result: number[] = [];

    current.forEach((curValue, index) => {
      const prevValue = previous[index];
      if (prevValue !== undefined) {
        let delta = curValue - prevValue;
        if (usePercentage) {
          delta = prevValue === 0 ? 0 : delta / prevValue;
        }
        result.push(delta);
      }
    });

    return result;
  }

  async onMetricUpdate(
    manager: MetricManager,
    ts: number,
    value: number | DDSketch,
  ): Promise<ErrorStatus> {
    // todo: check for full window
    const diffs = await this.loadDiffs(manager, ts);
    const change = !diffs.length ? 0 : this.calculationMethod(diffs);
    return this.evaluateThreshold(change);
  }

  static get schema(): ObjectSchema {
    return optionsSchema;
  }
}
