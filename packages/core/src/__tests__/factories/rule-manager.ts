import { HostManager, QueueConfig } from '../../hosts';
import { RuleManager } from '../../rules';
import { createHostManager } from './host-manager';
import { randomString } from './utils';

export async function createRuleManager(
  host?: HostManager,
): Promise<RuleManager> {
  const queueName = 'test-' + randomString(5);
  const queueConfig: QueueConfig = {
    name: queueName,
    prefix: 'test',
  };

  if (!host) {
    host = await createHostManager({
      queues: [queueConfig],
    });
  }

  await host.waitUntilReady();
  const queueManager = host.getQueueManager(queueName);
  return new RuleManager(queueManager);
}
