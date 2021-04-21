import { RuleManager } from '../../src/server/rules';
import { randomString } from '../server/utils';
import { QueueConfig } from '../../src/types';
import { createHostManager } from './host-manager';
import { HostManager } from '../../src/server/hosts';

export async function createRuleManager(
  host?: HostManager,
): Promise<RuleManager> {
  const queueName = 'test-' + randomString(5);
  const queueConfig: QueueConfig = {
    name: queueName,
    prefix: 'test',
  };

  if (!host) {
    const hostManager = createHostManager({
      queues: [queueConfig],
    });
    host = hostManager;
  }

  await host.waitUntilReady();
  const queueManager = host.getQueueManager(queueName);
  return new RuleManager(queueManager);
}
