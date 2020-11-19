import boom from '@hapi/boom';
import { NotificationChannel, NotificationChannelPlugin } from '../../types';
import { emailPlugin } from './email';
import { webhookPlugin } from './webhook';
import { slackPlugin } from './slack';

const plugins: NotificationChannelPlugin[] = [
  emailPlugin,
  webhookPlugin,
  slackPlugin,
];

export function createChannel(spec: Record<string, any>): NotificationChannel {
  const { id, type } = spec;
  if (!id) {
    throw boom.badImplementation('Missing for channel type');
  }
  if (!type) {
    throw boom.badRequest(`Missing channel type for id "${id}"`);
  }

  const plugin = plugins.find((x) => x.name === type);

  if (!plugin) {
    throw boom.badRequest(`Invalid channel type "${type}" in config`);
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
