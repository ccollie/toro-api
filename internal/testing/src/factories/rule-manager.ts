import { nanoid, QueueConfig } from '@alpen/core';
import { RuleManager, HostManager } from '../../src';
import { createHostManager } from './host-manager';

export async function createRuleManager(
  host?: HostManager,
): Promise<RuleManager> {
  const queueName = 'test-' + nanoid();
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
