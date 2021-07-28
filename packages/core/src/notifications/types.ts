import { AppInfo } from '../types';
import type { MailChannelConfig } from './email';
import type { SlackChannelConfig } from './slack/slack-channel';
import type { WebhookChannelConfig } from './webhook/webhook-channel';

export interface NotificationContext {
  host: {
    id: string;
    name: string;
    uri: string;
  };
  app: AppInfo;
  env: string;
}

export interface NotificationChannelProps {
  id?: string;
  readonly type: string;
  name: string;
  enabled?: boolean;
}

export type ChannelConfig =
  | SlackChannelConfig
  | MailChannelConfig
  | WebhookChannelConfig;

export interface NotificationChannel {
  id: string;
  readonly type: string;
  name: string;
  enabled: boolean;
  options: ChannelConfig;
  dispatch(
    context: NotificationContext,
    data: Record<string, any>,
    eventName?: string,
  ): void | Promise<void>;
}

export interface NotificationChannelPlugin {
  name: string;
  schema?: any; // todo: use joi definition
  createChannel(pluginData: any): NotificationChannel;
}
