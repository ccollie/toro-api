import {
  ChangeConditionEvaluator,
  ConditionEvaluator,
  PeakConditionEvaluator,
  RuleEvaluator,
  ThresholdConditionEvaluator,
} from '../../../src/server/rules';
import { delay } from '../utils';
import {
  BaseMetric,
  LatencyMetric,
  MetricsListener,
} from '../../../src/server/metrics';
import {
  ChangeAggregationType,
  ChangeTypeEnum,
  RuleConfigOptions,
  RuleOperator,
  RuleType,
} from '../../../src/types';
import { QueueListener } from '../../../src/server/queues';
import {
  QueueListenerHelper,
  clearDb,
  createQueueListener,
  createRule,
} from '../../factories';

class ExtRuleEvaluator extends RuleEvaluator {
  getEvaluator(): ConditionEvaluator {
    return this.evaluator;
  }
}

describe('RuleEvaluator', () => {
  let queueListener: QueueListener;
  let listenerHelper: QueueListenerHelper;
  let metricsListener: MetricsListener;
  let metric: BaseMetric;

  beforeEach(async () => {
    queueListener = await createQueueListener();
    listenerHelper = new QueueListenerHelper(queueListener);
    metricsListener = new MetricsListener(queueListener);
  });

  afterEach(async () => {
    await clearDb();
    if (metric) metric.destroy();
  });

  async function postJob(
    options?: Record<string, any>,
    needDelay = true,
  ): Promise<void> {
    await listenerHelper.postCompletedEvent(options);
    if (needDelay) {
      await delay(20);
    }
  }

  function createEvaluator(
    options?: Partial<RuleConfigOptions>,
  ): ExtRuleEvaluator {
    const rule = createRule(options);
    return new ExtRuleEvaluator(rule, metricsListener);
  }

  describe('constructor', () => {
    it('can create a RuleEvaluator', () => {
      const rule = createRule({
        metric: {
          type: 'latency',
          options: {},
        },
      });

      const evaluator = new RuleEvaluator(rule, metricsListener);
      expect(evaluator).toBeDefined();
      expect(evaluator.metric).toBeInstanceOf(LatencyMetric);
      expect(evaluator.rule).toBe(rule);
    });

    it('creates the proper type of evaluator depending on condition type', () => {
      let sut = createEvaluator({
        condition: {
          type: RuleType.CHANGE,
          changeType: ChangeTypeEnum.CHANGE,
          timeShift: 1000,
          windowSize: 10000,
          aggregationType: ChangeAggregationType.Avg,
          errorThreshold: 20,
          operator: RuleOperator.gt,
        },
      });
      expect(sut.getEvaluator()).toBeInstanceOf(ChangeConditionEvaluator);

      sut = createEvaluator({
        condition: {
          type: RuleType.CHANGE,
          changeType: ChangeTypeEnum.CHANGE,
          timeShift: 1000,
          windowSize: 10000,
          aggregationType: ChangeAggregationType.Avg,
          errorThreshold: 20,
          operator: RuleOperator.gt,
        },
      });
      expect(sut.getEvaluator()).toBeInstanceOf(ChangeConditionEvaluator);

      sut = createEvaluator({
        condition: {
          type: RuleType.PEAK,
          errorThreshold: 3.5,
          operator: RuleOperator.gt,
        },
      });
      expect(sut.getEvaluator()).toBeInstanceOf(PeakConditionEvaluator);

      sut = createEvaluator({
        condition: {
          type: RuleType.THRESHOLD,
          errorThreshold: 20,
          operator: RuleOperator.gt,
        },
      });
      expect(sut.getEvaluator()).toBeInstanceOf(ThresholdConditionEvaluator);
    });
  });

  describe('.evaluate', () => {
    it('is called when the metric is updated', async () => {
      const sut = createEvaluator();
      const spy = jest.spyOn(sut, 'evaluate');
      await delay(40);
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('is triggered by queue event', async () => {
      const sut = createEvaluator({ active: false });
      const spy = jest.spyOn(sut, 'evaluate');

      await postJob({ latency: 1000 });

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
