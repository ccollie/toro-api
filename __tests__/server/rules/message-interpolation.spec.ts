import {
  QueueConfig,
  RuleCondition,
  RuleConfigOptions,
  RuleMetric,
  RuleOperator,
  RuleType,
} from '@src/types';
import { Rule, RuleManager } from '@src/server/rules';
import { HostManager, nanoid, QueueManager } from '../common';
import {
  clearDb,
  createHostManager,
  createRuleOptions,
  QueueListenerHelper,
} from '../../factories';
import { delay } from '../utils';

describe('Rule Message Interpolation', () => {
  // jest.setTimeout(5000);
  let ruleManager: RuleManager;
  let listenerHelper: QueueListenerHelper;
  let hostManager: HostManager;
  let queueManager: QueueManager;
  let dispatchSpy;

  const condition: RuleCondition = {
    type: RuleType.THRESHOLD,
    errorThreshold: 1000,
    operator: RuleOperator.GT,
  };

  const metric: RuleMetric = {
    type: 'latency',
    options: {},
  };

  const SuccessData = { latency: 2000 };
  const FailureData = { latency: 500 };

  beforeEach(async function () {
    const queueConfig: QueueConfig = {
      name: `queue-${nanoid()}`,
      prefix: 'bull',
    };

    hostManager = createHostManager({
      queues: [queueConfig],
    });
    await hostManager.waitUntilReady();

    queueManager = hostManager.getQueueManager(queueConfig.name);
    ruleManager = new RuleManager(queueManager);
    listenerHelper = new QueueListenerHelper(ruleManager.queueListener);
    dispatchSpy = jest.spyOn(hostManager.notifications, 'dispatch');
  });

  afterEach(async function () {
    await clearDb(hostManager.client);
    await Promise.all([queueManager.destroy(), hostManager.destroy()]);
  });

  async function postJob(
    options?: Record<string, any>,
    needDelay = true,
  ): Promise<void> {
    await listenerHelper.postCompletedEvent(options);
    if (needDelay) {
      await delay(40);
    }
  }

  function addRule(template: string): Promise<Rule> {
    const channels = ['email', 'slack'];

    const opts: RuleConfigOptions = createRuleOptions({
      metricId: nanoid(),
      condition,
      channels,
      options: {
        alertOnReset: true,
      },
      message: template,
    });

    return ruleManager.addRule(opts);
  }

  async function triggerRule(
    rule: Rule,
    success = true,
  ): Promise<Record<string, any>> {
    const data = success ? SuccessData : FailureData;

    if (!success) {
      // we need to trip rule first so we can reset later
      await postJob(SuccessData);
    }

    await postJob(data);

    const call = dispatchSpy.mock.calls[0];
    dispatchSpy.mockClear();
    const [_event, _data, channels] = call;
    return {
      event: _event,
      data: _data,
      channels,
    };
  }

  describe('Basic substitution', () => {
    it('does basic substitution', async () => {
      const template = `
        {{queue.id}}
      `;

      const rule = await addRule(template);
      const args = await triggerRule(rule);
      expect(typeof args.data).toBe('object');
    });
  });
});
