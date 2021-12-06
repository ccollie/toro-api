import {
  ChangeAggregationType,
  ChangeConditionEvaluator,
  ChangeTypeEnum,
  ConditionEvaluator,
  PeakConditionEvaluator,
  RuleConfigOptions,
  RuleEvaluator,
  RuleOperator,
  RuleType,
  ThresholdConditionEvaluator,
} from '../';
import {
  BaseMetric,
  LatencyMetric,
  MetricsListener,
  P90Aggregator,
} from '../../metrics';
import { QueueListener } from '../../queues';
import {
  clearDb,
  createQueue,
  createQueueListener,
  createRule,
  QueueListenerHelper,
  randomString,
} from '../../__tests__/factories';
import { delay } from '../../lib';
import ms from 'ms';

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
    const queue = await createQueue();
    queueListener = await createQueueListener(queue);
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
    const metric = createMetric();
    const rule = createRule({
      ...options,
      metricId: metric.id,
    });
    return new ExtRuleEvaluator(rule, metric);
  }

  const DURATION = ms('2 min');

  function createMetric(): BaseMetric {
    const metric = new LatencyMetric({
      jobNames: [],
    });

    metric.name = `name-${randomString(4)}`;
    metric.aggregator = new P90Aggregator({
      duration: DURATION,
    });

    return metric;
  }

  describe('constructor', () => {
    it('can create a RuleEvaluator', () => {
      const metric = createMetric();
      const rule = createRule({
        metricId: metric.id,
      });

      const evaluator = new RuleEvaluator(rule, metric);
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
          aggregationType: ChangeAggregationType.AVG,
          errorThreshold: 20,
          operator: RuleOperator.GT,
        },
      });
      expect(sut.getEvaluator()).toBeInstanceOf(ChangeConditionEvaluator);

      sut = createEvaluator({
        condition: {
          type: RuleType.CHANGE,
          changeType: ChangeTypeEnum.CHANGE,
          timeShift: 1000,
          windowSize: 10000,
          aggregationType: ChangeAggregationType.AVG,
          errorThreshold: 20,
          operator: RuleOperator.GT,
        },
      });
      expect(sut.getEvaluator()).toBeInstanceOf(ChangeConditionEvaluator);

      sut = createEvaluator({
        condition: {
          type: RuleType.PEAK,
          errorThreshold: 3.5,
        },
      });
      expect(sut.getEvaluator()).toBeInstanceOf(PeakConditionEvaluator);

      sut = createEvaluator({
        condition: {
          type: RuleType.THRESHOLD,
          errorThreshold: 20,
          operator: RuleOperator.GT,
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
      const sut = createEvaluator({ isActive: false });
      const spy = jest.spyOn(sut, 'evaluate');

      await postJob({ latency: 1000 });

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });
});
