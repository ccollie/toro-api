import { EZContext } from 'graphql-ez';
import { HostManager, MetricName, QueueManager } from '@alpen/core';

export function getMetricContainer(
  context: EZContext,
  metric: string | MetricName,
): { queue?: QueueManager; host?: HostManager } {
  let mn: MetricName;
  if (typeof metric === 'string') {
    mn = MetricName.fromCanonicalName(metric);
  } else {
    mn = metric;
  }
  const queueId = mn.getTagValue('queue');
  const hostId = mn.getTagValue('host');
  const queue = context.accessors.getQueueManager(queueId);
  const host = context.accessors.getHost(hostId);
  return { queue, host };
}
