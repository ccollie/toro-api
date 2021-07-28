import { NotificationChannel, NotificationChannelPlugin } from '../types';

import schema from './schema';
import { SlackChannel } from './slack-channel';
import type { SlackChannelConfig } from './slack-channel';

function createChannel(options: SlackChannelConfig): NotificationChannel {
  return new SlackChannel(options);
}

export { SlackChannel, SlackChannelConfig };

export const slackPlugin: NotificationChannelPlugin = {
  name: 'slack',
  createChannel,
  schema,
};
