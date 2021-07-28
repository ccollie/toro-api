import { Channel } from './channel';
import { ChannelEvents, ChannelStorage } from './channel-storage';
import { MailChannel } from './email';
import { WebhookChannel } from './webhook';
import { SlackChannel } from './slack';
import { NotificationManager } from './notification-manager';
import { createChannel } from './channel-factory';

export * from './email/config';
export * from './types';

export type { MailChannelConfig } from './email';
export type { SlackChannelConfig } from './slack';
export type { WebhookChannelConfig } from './webhook';
export {
  Channel,
  ChannelStorage,
  ChannelEvents,
  createChannel,
  SlackChannel,
  MailChannel,
  NotificationManager,
  WebhookChannel,
};
