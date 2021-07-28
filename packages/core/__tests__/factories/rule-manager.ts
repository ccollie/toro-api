import { RuleManager, HostManager } from '../../src';
import { randomString } from '../utils';
import { QueueConfig } from '../../src/hosts';
import { createHostManager } from './host-manager';

export async function createRuleManager(
  host?: HostManager,
): Promise<RuleManager> {
  const queueName = 'test-' + randomString(5);
  const queueConfig: QueueConfig = {
    name: queueName,
    prefix: 'test',
  };

  if (!host) {
    host = createHostManager({
      queues: [queueConfig],
    });
  }

  await host.waitUntilReady();
  const queueManager = host.getQueueManager(queueName);
  return new RuleManager(queueManager);
}
