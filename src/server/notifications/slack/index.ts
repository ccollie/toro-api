import {
  NotificationChannelPlugin,
  SlackChannelConfig,
  NotificationChannel,
} from '../../../types';

import schema from './schema';
import { SlackChannel } from './slack-channel';

function createChannel(options: SlackChannelConfig): NotificationChannel {
  return new SlackChannel(options);
}

export { SlackChannel };

export const slackPlugin: NotificationChannelPlugin = {
  name: 'slack',
  createChannel,
  schema,
};
