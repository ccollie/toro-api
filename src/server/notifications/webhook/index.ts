import {
  NotificationChannelPlugin,
  NotificationChannel,
  WebhookChannelConfig,
} from '../../../types';
import schema from './schema';
import { WebhookChannel } from './webhook-channel';

function createChannel(options: WebhookChannelConfig): NotificationChannel {
  return new WebhookChannel(options);
}

export { WebhookChannel };

export const webhookPlugin: NotificationChannelPlugin = {
  name: 'webhook',
  createChannel,
  schema,
};
