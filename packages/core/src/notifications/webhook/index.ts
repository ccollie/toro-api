import { NotificationChannel, NotificationChannelPlugin } from '../types';
import schema from './schema';
import { WebhookChannel } from './webhook-channel';
import type { WebhookChannelConfig } from './webhook-channel';

function createChannel(options: WebhookChannelConfig): NotificationChannel {
  return new WebhookChannel(options);
}

export { WebhookChannel, WebhookChannelConfig };

export const webhookPlugin: NotificationChannelPlugin = {
  name: 'webhook',
  createChannel,
  schema,
};
