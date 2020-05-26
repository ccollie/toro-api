import { Queue } from 'bullmq';
import { MailMessageDefaults, MailTransportOpts } from 'mail';
import { AppInfo } from 'app-info';

export interface NotificationHandlerFunc {
  (context: NotificationContext, queue: Queue, message: any): any;
}

export interface NotificationPlugin {
  init(context: NotificationInitContext, pluginData: any): void;
  schema?: any; // todo: use joi definition
  destroy?: Function;
}

export interface NotificationInitContext {
  id: string;
  type: string;
  config: any;
  on: (eventName: string, handler: NotificationHandlerFunc) => void;
}

export interface NotificationContext {
  host?: string;
  appInfo: AppInfo;
  urlService: any;
  env: Record<string, any>;
  config: any;
}

export interface NotifierConfig {
  id: string;
  type: string;
  disable: boolean;
  [propName: string]: any;
}

export interface SlackNotifierConfig extends NotifierConfig {
  token: string;
  webhook?: string;
  channel?: string;
  username: string;
}

export interface MailNotifierConfig extends NotifierConfig {
  templateDir: string;
  transport: MailTransportOpts;
  messageDefaults?: MailMessageDefaults;
}
