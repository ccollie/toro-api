import type { MailChannelConfig } from './email';
import type { SlackChannelConfig } from './slack/slack-channel';
import type { WebhookChannelConfig } from './webhook/webhook-channel';

export type ChannelConfig =
  | SlackChannelConfig
  | MailChannelConfig
  | WebhookChannelConfig;
