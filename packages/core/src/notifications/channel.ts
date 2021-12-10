import { badImplementation, badData, notImplemented } from '@hapi/boom';
import { systemClock } from '../lib';
import {
  ChannelConfig,
  NotificationChannel,
  NotificationContext,
} from './types';

/***
 * This class holds metadata for a channel instance
 */
export class Channel<TConfig extends ChannelConfig = ChannelConfig>
  implements NotificationChannel
{
  public options: TConfig;
  public createdAt: number;
  public updatedAt: number;

  constructor(options?: TConfig) {
    const { id } = options || {};
    if (!id) {
      const type = this.options?.type;
      throw badImplementation(`Missing id for channel type "${type}"`);
    }
    this.options = options;
    this.createdAt = systemClock.getTime();
    this.updatedAt = this.createdAt;
  }

  get type(): string {
    return this.options?.type || 'channel';
  }

  get id(): string {
    return this.options.id;
  }

  get name(): string {
    return this.options.name;
  }

  set name(value: string) {
    if (!value) {
      throw badData('Channel names cannot be empty');
    }
    this.options.name = value;
  }

  get enabled(): boolean {
    return this.options?.enabled;
  }

  set enabled(value: boolean) {
    this.options.enabled = value;
  }

  public update(options: Partial<TConfig>): void {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...rest } = options;
    if (rest.hasOwnProperty('name') && !rest.name) {
      throw badData('Channel names cannot be empty');
    }
    Object.assign(this.options, rest);
  }

  async dispatch(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    context: NotificationContext,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    message: Record<string, any>,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    eventName?: string,
  ): Promise<void> {
    throw notImplemented('dispatch');
  }

  async error(
    context: NotificationContext,
    message: Record<string, any>,
    eventName?: string,
  ): Promise<void> {
    return this.dispatch(context, message, eventName);
  }

  toJSON(): Record<string, any> {
    return {
      id: this.id,
      type: this.type,
      ...(this.options || {}),
    };
  }
}
