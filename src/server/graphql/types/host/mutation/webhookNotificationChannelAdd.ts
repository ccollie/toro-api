import { FieldConfig } from '../../index';
import {
  WebhookNotificationChannelTC,
  WebhookNotificationChannelInputTC,
} from '../model/NotificationChannel';
import { getHostById } from '../../../helpers';
import { publishCreatedEvent } from './utils';
import { WebhookChannel } from '../../../../notifications';

export const webhookNotificationChannelAdd: FieldConfig = {
  description: 'Add a webhook notification channel',
  type: WebhookNotificationChannelTC.NonNull,
  args: {
    input: WebhookNotificationChannelInputTC,
  },
  resolve: async (_, { input }, context) => {
    const { hostId, ...channelConfig } = input;
    const host = getHostById(hostId);
    channelConfig.type = 'webhook';
    const channel = await host.notifications.addChannel<WebhookChannel>(
      channelConfig,
    );
    publishCreatedEvent(context, host, channel);
    return channel;
  },
};
