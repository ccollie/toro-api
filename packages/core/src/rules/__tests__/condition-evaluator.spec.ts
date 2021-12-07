import { LatencyMetric } from '../../metrics';
import {
  ErrorStatus,
  PeakCondition,
  PeakSignalDirection,
  RuleOperator,
  RuleType,
  ThresholdCondition,
  PeakConditionEvaluator,
  ThresholdConditionEvaluator,
} from '../';
import { ManualClock } from '../../lib';

describe('Condition Evaluation', () => {
  describe('ThresholdConditionEvaluator', () => {
    function createEvaluator(
      options?: Partial<ThresholdCondition>,
    ): ThresholdConditionEvaluator {
      const defaults: ThresholdCondition = {
        type: RuleType.THRESHOLD,
        errorThreshold: 0,
        operator: RuleOperator.GT,
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
          operator: RuleOperator.GT,
        };
        const sut = new ThresholdConditionEvaluator(metric, options);
        expect(sut).toBeDefined();
        expect(sut.metric).toBe(metric);
      });
    });

    describe('.evaluate', () => {
      it('triggers on errorThreshold', () => {
        const sut = createEvaluator({
          errorThreshold: 10,
          operator: RuleOperator.LT,
        });
        const result = sut.evaluate(5, 1000);
        expect(result.triggered).toBe(true);
        expect(result.state).toMatchObject({
          value: 5,
          ruleType: RuleType.THRESHOLD,
          errorLevel: ErrorStatus.ERROR,
          unit: 'ms',
        });
      });

      it('returns triggered for warningThreshold', () => {
        const sut = createEvaluator({
          errorThreshold: 20,
          warningThreshold: 10,
          operator: RuleOperator.GT,
        });
        const result = sut.evaluate(12, 1000);
        expect(result.triggered).toBe(true);
        expect(result.state).toMatchObject({
          value: 12,
          ruleType: RuleType.THRESHOLD,
          errorLevel: ErrorStatus.WARNING,
          unit: 'ms',
        });
      });

      it('properly handles comparisons', () => {
        const testData = [
          {
            options: { errorThreshold: 10, operator: RuleOperator.EQ },
            value: 10,
            expected: true,
          },
          {
            options: { errorThreshold: 11, operator: RuleOperator.NE },
            value: 11,
            expected: false,
          },
          {
            options: { errorThreshold: 100, operator: RuleOperator.GT },
            value: 110,
            expected: true,
          },
          {
            options: { errorThreshold: 99, operator: RuleOperator.GTE },
            value: 99,
            expected: true,
          },
          {
            options: { errorThreshold: 50, operator: RuleOperator.LT },
            value: 51,
            expected: false,
          },
          {
            options: { errorThreshold: 73, operator: RuleOperator.LTE },
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
          const result = sut.evaluate(value, 1000);
          expect(result.triggered).toBe(expected);
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
      const clock: ManualClock = new ManualClock(1000);
      const defaults: PeakCondition = {
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
          type: RuleType.PEAK,
          errorThreshold: 3.5,
          influence: 0,
          lag: 0,
          direction: PeakSignalDirection.BOTH,
        };
        const sut = new PeakConditionEvaluator(metric, options);
        expect(sut).toBeDefined();
        expect(sut.metric).toBe(metric);
      });
    });

    describe('.evaluate', () => {
      const testData: number[] = [
        1, 1, 1.1, 1, 0.9, 1, 1, 1.1, 1, 0.9, 1, 1.1, 1, 1, 0.9, 1, 1, 1.1, 1,
        1, 1, 1, 1.1, 0.9, 1, 1.1, 1, 1, 0.9, 1, 1.1, 1, 1, 1.1, 1, 0.8, 0.9, 1,
        1.2, 0.9, 1, 1, 1.1, 1.2, 1, 1.5, 1, 3, 2, 5, 3, 2, 1, 1, 1, 0.9, 1, 1,
        3, 2.6, 4, 3, 3.2, 2, 1, 1, 0.8, 4, 4, 2, 2.5, 1, 1, 1,
      ];

      //results from original implementation
      const knownResults: number[] = [
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
        0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1,
        1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 1, 1, 1, 1, 0,
        0, 0,
      ];

      it('triggers on errorThreshold', () => {
        const sut = createEvaluator({ errorThreshold: 3.5, influence: 0 });
        for (let i = 0; i < testData.length; i++) {
          const value = testData[i];
          const result = sut.evaluate(value, 1000 + i * 10);
          expect(result.triggered).toBe(!!knownResults[i]);
          if (result.triggered) {
            expect(result.state).toMatchObject({
              value,
              ruleType: RuleType.PEAK,
              errorLevel: ErrorStatus.ERROR,
              unit: 'ms',
            });
          } else {
            expect(result.state).toMatchObject({
              value,
              ruleType: RuleType.PEAK,
              errorLevel: ErrorStatus.NONE,
              unit: 'ms',
            });
          }
        }
      });

      it('triggers on warningThreshold', () => {
        const sut = createEvaluator({
          errorThreshold: 20,
          warningThreshold: 10,
        });
        const result = sut.evaluate(12, 1000);
        expect(result.triggered).toBe(true);
        expect(result.state).toMatchObject({
          value: 12,
          ruleType: RuleType.PEAK,
          errorLevel: ErrorStatus.WARNING,
          unit: 'ms',
        });
      });
    });
  });
});
