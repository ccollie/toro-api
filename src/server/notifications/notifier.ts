import boom from '@hapi/boom';
import {
  NotificationHandlerFunc,
  NotificationInitContext,
  NotifierConfig,
} from '@src/types';
import config from '../config';
import { createDebug } from '../lib/debug';
import { consolePlugin } from './console';
import { emailPlugin } from './nodemailer';
import { webhookPlugin } from './webhooks';
import { slackPlugin } from './slack';

const debug = createDebug('notifications');

const notifiers = {
  console: consolePlugin,
  mail: emailPlugin,
  webhook: webhookPlugin,
  slack: slackPlugin,
};

/***
 * This class holds metadata for a notifier instance
 */
export class Notifier {
  public id: string;
  public type: string;
  public options: NotifierConfig;
  public handlers: Record<string, NotificationHandlerFunc>;
  public cleanup: Function = null;
  public disable = false;

  destroy(): void {
    if (this.cleanup) {
      return this.cleanup();
    }
  }
}

export function createNotifier(spec: any): Notifier {
  const { id, type, disable = false } = spec;
  if (!id) {
    throw boom.badImplementation('Missing for notifier type');
  }
  if (!type) {
    throw boom.badRequest(`Missing notifier type for id "${id}"`);
  }

  if (!notifiers[type]) {
    throw boom.badRequest(`Invalid notifier type "${type}" in config`);
  }

  const { schema, init } = notifiers[type];
  const { error, value } = schema.validate(spec);

  if (error) {
    console.log(error);
    throw error;
  }
  // callback registration function to collect handlers
  const handlers: Record<string, NotificationHandlerFunc> = {};
  const register = (eventName: string, handler: NotificationHandlerFunc) => {
    handlers[eventName] = handler;
  };

  const context: NotificationInitContext = {
    id,
    type,
    config,
    on: register,
  };

  // create the instance
  init(context, value);
  const cleanup = handlers.cleanup;

  const notifier = new Notifier();
  notifier.id = id;
  notifier.type = type;
  notifier.cleanup = cleanup;
  notifier.handlers = handlers;
  notifier.disable = disable;
  notifier.options = value;

  return notifier;
}
