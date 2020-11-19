import { FieldConfig } from '../../index';
import {
  SlackNotificationChannelTC,
  SlackNotificationChannelInputTC,
} from '../model/NotificationChannel';
import { getHostById } from '../../../helpers';
import { SlackChannel } from '../../../../notifications';
import { publishCreatedEvent } from './utils';

export const slackNotificationChannelAdd: FieldConfig = {
  type: SlackNotificationChannelTC,
  args: {
    input: SlackNotificationChannelInputTC,
  },
  resolve: async (_, { input }, context) => {
    const { hostId, ...channelConfig } = input;
    const host = getHostById(hostId);
    channelConfig.type = 'slack';
    const channel = await host.notifications.addChannel<SlackChannel>(
      channelConfig,
    );
    publishCreatedEvent(context, host, channel);
    return channel;
  },
};
