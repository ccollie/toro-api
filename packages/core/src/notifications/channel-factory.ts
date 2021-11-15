import { badRequest, badImplementation } from '@hapi/boom';
import { NotificationChannel, NotificationChannelPlugin, NotificationChannelProps } from '../types';
import { emailPlugin } from './email';
import { webhookPlugin } from './webhook';
import { slackPlugin } from './slack';

const plugins: NotificationChannelPlugin<NotificationChannelProps>[] = [
  emailPlugin,
  webhookPlugin,
  slackPlugin,
];

export function createChannel(spec: Record<string, any>): NotificationChannel {
  const { id, type } = spec;
  if (!id) {
    throw badImplementation('Missing for channel type');
  }
  if (!type) {
    throw badRequest(`Missing channel type for id "${id}"`);
  }

  const plugin = plugins.find((x) => x.name === type);

  if (!plugin) {
    throw badRequest(`Invalid channel type "${type}" in config`);
  }

  const { schema, createChannel: create } = plugin;
  const { error, value: options } = schema.validate(spec);

  if (error) {
    console.log(error);
    throw error;
  }

  // create the instance
  return create(options);
}
