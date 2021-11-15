import { NotificationChannel, NotificationChannelPlugin } from '../../types';

import schema from './schema';
import { SlackChannel } from './slack-channel';
import type { SlackChannelConfig } from './slack-channel';

function createChannel(options: SlackChannelConfig): NotificationChannel<SlackChannelConfig> {
  return new SlackChannel(options);
}

export { SlackChannel, SlackChannelConfig };

export const slackPlugin: NotificationChannelPlugin<SlackChannelConfig> = {
  name: 'slack',
  createChannel,
  schema,
};
