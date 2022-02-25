import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../index';
import { NotificationChannelTC } from '../../host/scalars';
import { Rule } from '@alpen/core';

export const channels: FieldConfig = {
  type: NotificationChannelTC.NonNull.List.NonNull,
  description: 'Rule notification channels',
  async resolve(rule: Rule, _, { accessors }: EZContext): Promise<any[]> {
    const queueManager = accessors.getQueueManager(rule.queueId);
    if (rule.channels?.length == 0) {
      return [];
    }
    const channels = await queueManager.hostManager.getChannels();
    if (channels.length === 0) {
      return [];
    }

    const result = [];
    for (const channelId of rule.channels) {
      const channel = channels.find((x) => x.id === channelId);
      channel && result.push(channel);
    }
    return result;
  },
};
