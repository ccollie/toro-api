import random from 'lodash/random';
import {
  ChangeConditionEvaluator,
  ConditionEvaluator,
  PeakConditionEvaluator,
  RuleEvaluator,
  ThresholdConditionEvaluator,
} from '../../../src/server/rules';
import { clearDb, delay } from '../utils';
import { QueueListenerHelper } from '../../fixtures';
import {
  BaseMetric,
  LatencyMetric,
  MetricsListener,
} from '../../../src/server/metrics';
import {
  ChangeAggregationType,
  ChangeTypeEnum,
  RuleAlert,
  RuleCondition,
  RuleConfigOptions,
  RuleEventsEnum,
  RuleMetric,
  RuleOperator,
  RuleState,
  RuleType,
} from '../../../src/types';
import { createQueueListener, createRule, randomString } from './utils';
import { QueueListener } from '../../../src/server/queues';

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
      sut.metric.update(10);
      sut.metric.update(0);
      await delay(40);
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('not called if the rule is not ACTIVE', async () => {
      const sut = createEvaluator({ active: false });
      const spy = jest.spyOn(sut, 'evaluate');

      sut.metric.update(10);
      await delay(40);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('is triggered by queue event', async () => {
      const sut = createEvaluator({ active: false });
      const spy = jest.spyOn(sut, 'evaluate');

      await postJob({ latency: 1000 });

      expect(spy).toHaveBeenCalledTimes(1);
    });
  });

  describe('Alerts', () => {
    const condition: RuleCondition = {
      type: RuleType.THRESHOLD,
      operator: RuleOperator.gt,
      errorThreshold: 100,
    };

    it('raise an event on trigger', async () => {
      let called = 0;
      const payload = {
        num: random(0, 99),
        str: randomString(4),
      };
      let alert: RuleAlert;
      const sut = await createEvaluator({
        condition,
        payload,
      });

      const rule = sut.rule;
      rule.on(RuleEventsEnum.ALERT_TRIGGERED, (eventData: RuleAlert) => {
        alert = eventData;
        called++;
      });
      sut.metric.update(101);
      await delay(40);

      expect(called).toBe(1);
      expect(alert).toBeDefined();
      expect(alert.start).toBeDefined();
      expect(alert.event).toBe(RuleEventsEnum.ALERT_TRIGGERED);
      expect(alert.message).toBeDefined();
      expect(rule.alertCount).toBe(1);
      expect(rule.isTriggered).toBe(true);
    });

    it('raise an event on reset', async () => {
      metric = new LatencyMetric({});
      const sut = await createEvaluator({
        metric: metric.toJSON() as RuleMetric,
        condition,
      });

      const triggerSpy = jest.fn();
      sut.rule.on(RuleEventsEnum.ALERT_RESET, triggerSpy);

      sut.metric.update(101);
      // should be triggered

      await delay(20);
      sut.metric.update(50);

      await delay(20);
      expect(triggerSpy).toHaveBeenCalledTimes(1);
    });

    it('does not raise an alert if the rule is not ACTIVE', async () => {
      const sut = createEvaluator({ active: false });
      const triggerSpy = jest.fn();
      sut.rule.on(RuleEventsEnum.ALERT_TRIGGERED, triggerSpy);

      sut.metric.update(20);
      await delay(40);

      expect(triggerSpy).toHaveBeenCalledTimes(0);
    });

    it('triggers a states change on a warning', async () => {
      const sut = createEvaluator({
        condition: {
          type: RuleType.THRESHOLD,
          errorThreshold: 3000,
          warningThreshold: 1000,
          operator: RuleOperator.eq,
        },
      });

      let count = 0;
      sut.rule.on(RuleEventsEnum.STATE_CHANGED, ({ state }) => {
        if (state === RuleState.WARNING) count++;
      });

      sut.metric.update(1000);
      await delay(40);

      expect(count).toBe(1);
    });
  });
});
