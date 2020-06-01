import { RuleManager } from '../../src/server/rules';
import { randomString } from '../server/utils';
import { QueueConfig } from '../../src/types';
import { createHostManager } from './host-manager';

export async function createRuleManager(): Promise<RuleManager> {
  const queueName = 'test-' + randomString(5);
  const queueConfig: QueueConfig = {
    name: queueName,
    prefix: 'bull'
  };

  const hostManager = createHostManager({
    queues: [ queueConfig ]
  });
  await hostManager.waitUntilReady();
  const queueManager = hostManager.getQueueManager(queueName);
  return new RuleManager(queueManager);
}
