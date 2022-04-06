import { AppInfo } from './app-info';

export interface NotificationContext {
  host: {
    id: string;
    name: string;
    uri?: string;
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

export interface NotificationChannel<
  TProp extends NotificationChannelProps = NotificationChannelProps,
> {
  id: string;
  readonly type: string;
  name: string;
  enabled: boolean;
  options: TProp;
  dispatch(
    context: NotificationContext,
    data: Record<string, any>,
    eventName?: string,
  ): void | Promise<void>;
}

export interface NotificationChannelPlugin<
  TProp extends NotificationChannelProps,
> {
  name: string;
  schema?: any; // todo: use joi definition
  createChannel(pluginData: any): NotificationChannel<TProp>;
}
