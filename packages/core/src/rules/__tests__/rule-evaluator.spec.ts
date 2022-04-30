import {
  ChangeConditionEvaluator,
  ConditionEvaluator,
  PeakConditionEvaluator,
  RuleEvaluator,
  ThresholdConditionEvaluator,
} from '../';
import {
  ChangeTypeEnum,
  RuleConfigOptions,
  RuleOperator,
  RuleType,
} from '../../types';
import { Gauge as GaugeName } from '../../metrics/metric-name';
import { Metric, AggregationType, NoTags } from '../../metrics';
import { QueueListener } from '../../queues';
import {
  clearDb,
  createQueue,
  createQueueListener,
  createRule,
  QueueListenerHelper,
} from '../../__tests__/factories';
import { delay } from '../../lib';

class ExtRuleEvaluator extends RuleEvaluator {
  getEvaluator(): ConditionEvaluator {
    return this.evaluator;
  }
}

describe('RuleEvaluator', () => {
  let queueListener: QueueListener;
  let listenerHelper: QueueListenerHelper;
  let metric: Metric;

  beforeEach(async () => {
    const queue = await createQueue();
    queueListener = await createQueueListener(queue);
    listenerHelper = new QueueListenerHelper(queueListener);
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

  function createMetric(): Metric {
    const mn = new GaugeName('jobs_active', NoTags, NoTags);
    return new Metric(mn);
  }

  describe('constructor', () => {
    it('can create a RuleEvaluator', () => {
      const metric = createMetric();
      const rule = createRule({
        metricId: metric.id,
      });

      const evaluator = new RuleEvaluator(rule, metric);
      expect(evaluator).toBeDefined();
      expect(evaluator.rule).toBe(rule);
    });

    it('creates the proper type of evaluator depending on condition type', () => {
      let sut = createEvaluator({
        condition: {
          type: RuleType.CHANGE,
          changeType: ChangeTypeEnum.CHANGE,
          timeShift: 1000,
          windowSize: 10000,
          aggregationType: AggregationType.AVG,
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
          aggregationType: AggregationType.AVG,
          errorThreshold: 20,
          operator: RuleOperator.GT,
        },
      });
      expect(sut.getEvaluator()).toBeInstanceOf(ChangeConditionEvaluator);

      sut = createEvaluator({
        condition: {
          type: RuleType.PEAK,
          deviations: 3.5,
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
