export enum RuleType {
  THRESHOLD = 'THRESHOLD',
  PEAK = 'PEAK',
  CHANGE = 'CHANGE',
}

/**
 * Thresholds for triggering an alert
 */
export interface NotificationThresholds {
  /**
   * The value used to trigger an error notification.
   */
  errorThreshold: number;
  /**
   * The value used to trigger an warning notification.
   */
  warningThreshold?: number;
}

export enum RuleOperator {
  EQ = 'EQ',
  NE = 'NE',
  GT = 'GT',
  LT = 'LT',
  GTE = 'GTE',
  LTE = 'LTE',
}

export interface RuleConditionThresholds extends NotificationThresholds {
  readonly operator: RuleOperator;
}

export interface ThresholdCondition extends RuleConditionThresholds {
  readonly type: RuleType.THRESHOLD;
}

export enum PeakSignalDirection {
  ABOVE = 'ABOVE',
  BELOW = 'BELOW',
  BOTH = 'BOTH',
}

export interface PeakCondition extends NotificationThresholds {
  readonly type: RuleType.PEAK;
  /**
   * the influence (between 0 and 1) of new signals on the mean and standard deviation
   * where 1 is normal influence, 0.5 is half
   */
  influence?: number;
  /**
   * The lag of the moving window (in milliseconds)
   * For example, a lag of 5000 will use the last 5 seconds of observations
   * to smooth the data.
   */
  lag?: number;
  /**
   * Trigger if value is above, below, or either above/below the given
   * deviation threshold
   */
  direction?: PeakSignalDirection;
}

export enum ChangeAggregationType {
  MAX = 'MAX',
  MIN = 'MIN',
  AVG = 'AVG',
  SUM = 'SUM',
  P90 = 'P90',
  P95 = 'P95',
  P99 = 'P99',
}

export enum ChangeTypeEnum {
  CHANGE = 'CHANGE',
  PCT = 'PCT',
}

export interface ChangeConditionOptions extends RuleConditionThresholds {
  readonly changeType: ChangeTypeEnum;
  /**
   The sliding window for metric measurement
   */
  windowSize: number;
  /**
   * Lookback period (ms). How far back are we going to compare
   * eg 1 hour means we're comparing now vs 1 hour ago
   */
  timeShift?: number;
  aggregationType: ChangeAggregationType;
  sampleInterval?: number;
}

/**
 * A change alert compares the absolute or relative (%) change in value between
 * a given time ago and now against a given threshold.
 */
export interface ChangeCondition extends ChangeConditionOptions {
  readonly type: RuleType.CHANGE;
}

export type RuleCondition =
  | PeakCondition
  | ThresholdCondition
  | ChangeCondition;
