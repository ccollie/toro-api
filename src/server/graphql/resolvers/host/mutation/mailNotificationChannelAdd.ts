import { FieldConfig } from '../../index';
import {
  MailNotificationChannelInputTC,
  MailNotificationChannelTC,
} from '../query/NotificationChannel';
import { getHostById } from '../../../helpers';
import { publishCreatedEvent } from './utils';
import { MailChannel } from '../../../../notifications';

export const mailNotificationChannelAdd: FieldConfig = {
  type: MailNotificationChannelTC.NonNull,
  args: {
    input: MailNotificationChannelInputTC,
  },
  resolve: async (_, { input }, context) => {
    const { hostId, ...channelConfig } = input;
    const host = getHostById(hostId);
    channelConfig.type = 'mail';
    const channel = await host.notifications.addChannel<MailChannel>(
      channelConfig,
    );
    publishCreatedEvent(context, host, channel);
    return channel;
  },
};
