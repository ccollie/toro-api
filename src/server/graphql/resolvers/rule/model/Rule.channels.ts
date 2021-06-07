import { FieldConfig } from '../../../resolvers';
import { NotificationChannelTC } from '../../host/scalars/notifications';
import { getQueueManager } from '../../../helpers';
import { Rule } from '@server/rules';

export const ruleChannels: FieldConfig = {
  type: NotificationChannelTC.NonNull.List.NonNull,
  description: 'Rule notification channels',
  async resolve(rule: Rule): Promise<any[]> {
    const queueManager = getQueueManager(rule.queueId);
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
