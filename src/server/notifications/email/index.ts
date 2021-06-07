import schema from './schema';
import {
  MailChannelConfig,
  NotificationChannelPlugin,
  NotificationChannel,
} from '@src/types/notifications';
import { MailChannel } from './mail-channel';

function createChannel(options: MailChannelConfig): NotificationChannel {
  return new MailChannel(options);
}

export { MailChannel };

export const emailPlugin: NotificationChannelPlugin = {
  name: 'mail',
  createChannel,
  schema,
};
