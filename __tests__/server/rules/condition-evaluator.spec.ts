import isEmpty from 'lodash/isEmpty';
import { LatencyMetric } from '../../../src/server/metrics';
import {
  ErrorLevel,
  PeakCondition,
  PeakSignalDirection,
  RuleType,
  ThresholdCondition,
} from '../../../src/types';
import {
  PeakConditionEvaluator,
  ThresholdConditionEvaluator,
} from '../../../src/server/rules';
import { RuleOperator } from '../../../src/types';

describe('Condition Evaluation', () => {
  describe('ThresholdConditionEvaluator', () => {
    function createEvaluator(
      options?: Partial<ThresholdCondition>,
    ): ThresholdConditionEvaluator {
      const defaults: ThresholdCondition = {
        type: RuleType.THRESHOLD,
        errorThreshold: 0,
        operator: RuleOperator.gt,
      };
      const opts = { ...defaults, ...(options || {}) };
      const metric = new LatencyMetric({});
      return new ThresholdConditionEvaluator(metric, opts);
    }

    describe('constructor', () => {
      it('can construct an instance', () => {
        const metric = new LatencyMetric({});
        const options: ThresholdCondition = {
          type: RuleType.THRESHOLD,
          errorThreshold: 0,
          operator: RuleOperator.gt,
        };
        const sut = new ThresholdConditionEvaluator(metric, options);
        expect(sut).toBeDefined();
        expect(isEmpty(sut.state)).toBe(true);
        expect(sut.metric).toBe(metric);
      });
    });

    describe('.evaluate', () => {
      it('returns success for errorThreshold', () => {
        const sut = createEvaluator({
          errorThreshold: 10,
          operator: RuleOperator.lt,
        });
        const result = sut.evaluate(5);
        expect(result.success).toBe(true);
        expect(result.state).toMatchObject({
          value: 5,
          ruleType: RuleType.THRESHOLD,
          errorLevel: ErrorLevel.CRITICAL,
          unit: 'ms',
        });
      });

      it('returns success for warningThreshold', () => {
        const sut = createEvaluator({
          errorThreshold: 20,
          warningThreshold: 10,
          operator: RuleOperator.gt,
        });
        const result = sut.evaluate(12);
        expect(result.success).toBe(true);
        expect(result.state).toMatchObject({
          value: 12,
          ruleType: RuleType.THRESHOLD,
          errorLevel: ErrorLevel.WARNING,
          unit: 'ms',
        });
      });

      it('properly handles comparisons', () => {
        const testData = [
          {
            options: { errorThreshold: 10, operator: RuleOperator.eq },
            value: 10,
            expected: true,
          },
          {
            options: { errorThreshold: 11, operator: RuleOperator.ne },
            value: 11,
            expected: false,
          },
          {
            options: { errorThreshold: 100, operator: RuleOperator.gt },
            value: 110,
            expected: true,
          },
          {
            options: { errorThreshold: 99, operator: RuleOperator.gte },
            value: 99,
            expected: true,
          },
          {
            options: { errorThreshold: 50, operator: RuleOperator.lt },
            value: 51,
            expected: false,
          },
          {
            options: { errorThreshold: 73, operator: RuleOperator.lte },
            value: 73,
            expected: true,
          },
        ];

        testData.forEach(({ options, value, expected }) => {
          const opts: ThresholdCondition = {
            type: RuleType.THRESHOLD,
            errorThreshold: options.errorThreshold,
            operator: options.operator,
          };
          const sut = createEvaluator(opts);
          const result = sut.evaluate(value);
          expect(result.success).toBe(expected);
          expect(result.state).toMatchObject({
            value,
            ruleType: RuleType.THRESHOLD,
            // errorLevel: ErrorLevel.CRITICAL,
            unit: 'ms',
          });
        });
      });
    });
  });

  describe('PeakConditionEvaluator', () => {
    function createEvaluator(
      options?: Partial<PeakCondition>,
    ): PeakConditionEvaluator {
      const defaults: PeakCondition = {
        operator: RuleOperator.gt,
        type: RuleType.PEAK,
        influence: 0.5,
        lag: 0,
        errorThreshold: 3.5,
      };
      const opts = { ...defaults, ...(options || {}) };
      const metric = new LatencyMetric({});
      return new PeakConditionEvaluator(metric, opts);
    }

    describe('constructor', () => {
      it('can construct an instance', () => {
        const metric = new LatencyMetric({});
        const options: PeakCondition = {
          operator: RuleOperator.gt,
          type: RuleType.PEAK,
          errorThreshold: 3.5,
          influence: 0,
          lag: 0,
          direction: PeakSignalDirection.BOTH,
        };
        const sut = new PeakConditionEvaluator(metric, options);
        expect(sut).toBeDefined();
        expect(isEmpty(sut.state)).toBe(true);
        expect(sut.metric).toBe(metric);
      });
    });

    describe('.evaluate', () => {
      it('returns success for errorThreshold', () => {
        const sut = createEvaluator({ errorThreshold: 10 });
        const result = sut.evaluate(5);
        expect(result.success).toBe(true);
        expect(result.state).toMatchObject({
          value: 5,
          ruleType: RuleType.THRESHOLD,
          errorLevel: ErrorLevel.CRITICAL,
          unit: 'ms',
        });
      });

      it('returns success for warningThreshold', () => {
        const sut = createEvaluator({
          errorThreshold: 20,
          warningThreshold: 10,
        });
        const result = sut.evaluate(12);
        expect(result.success).toBe(true);
        expect(result.state).toMatchObject({
          value: 12,
          ruleType: RuleType.THRESHOLD,
          errorLevel: ErrorLevel.WARNING,
          unit: 'ms',
        });
      });

      it('properly handles comparisons', () => {
        const testData = [
          {
            options: { errorThreshold: 10, operator: RuleOperator.eq },
            value: 10,
            expected: true,
          },
          {
            options: { errorThreshold: 11, operator: RuleOperator.ne },
            value: 11,
            expected: false,
          },
          {
            options: { errorThreshold: 100, operator: RuleOperator.gt },
            value: 110,
            expected: true,
          },
          {
            options: { errorThreshold: 99, operator: RuleOperator.gte },
            value: 99,
            expected: true,
          },
          {
            options: { errorThreshold: 50, operator: RuleOperator.lt },
            value: 51,
            expected: false,
          },
          {
            options: { errorThreshold: 73, operator: RuleOperator.lte },
            value: 73,
            expected: true,
          },
        ];

        testData.forEach(({ options, value, expected }) => {
          const opts: Partial<PeakCondition> = {
            errorThreshold: options.errorThreshold,
            operator: options.operator,
          };
          const sut = createEvaluator(opts);
          const result = sut.evaluate(value);
          expect(result.success).toBe(expected);
          expect(result.state).toMatchObject({
            value,
            ruleType: RuleType.THRESHOLD,
            // errorLevel: ErrorLevel.CRITICAL,
            unit: 'ms',
          });
        });
      });
    });
  });
});
