import schema from './schema';
import { NotificationChannel, NotificationChannelPlugin } from '../../types';

import { MailChannel } from './mail-channel';
import type { MailChannelConfig } from './mail-channel';

function createChannel(options: MailChannelConfig): NotificationChannel<MailChannelConfig> {
  return new MailChannel(options);
}

export * from './config';
export { MailChannel, MailChannelConfig };

export const emailPlugin: NotificationChannelPlugin<MailChannelConfig> = {
  name: 'mail',
  createChannel,
  schema,
};
