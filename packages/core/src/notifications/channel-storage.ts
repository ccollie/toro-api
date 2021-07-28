import boom from '@hapi/boom';
import { isEmpty, isFunction, isObject } from 'lodash';
import { getUniqueId, systemClock } from '../lib';
import { NotificationChannelProps } from './types';
import { Channel } from './channel';
import { BusEventHandler, EventBus, UnsubscribeFn } from '../redis';
import { HostManager } from '../hosts';
import { createChannel } from './channel-factory';
import { RedisClient } from 'bullmq';
import { logger } from '../logger';
import { getHostKey } from '../keys';
import { parseBool } from '@alpen/shared';

export const enum ChannelEvents {
  Added = 'channel.added',
  Deleted = 'channel.deleted',
  Enabled = 'channel.enabled',
  Disabled = 'channel.disabled',
  Updated = 'channel.updated',
}

/* eslint @typescript-eslint/no-use-before-define: 0 */
/**
 * Manages the storage of {@link Channel} instances related to a host
 */
export class ChannelStorage {
  public readonly host: string;
  private readonly bus: EventBus;

  /**
   * Construct a {@link RuleManager}
   * @param hostManager
   */
  constructor(private readonly hostManager: HostManager) {
    this.bus = hostManager.bus;
  }

  destroy(): void {
    //
  }

  private get client(): RedisClient {
    return this.hostManager.client;
  }

  private get hostName(): string {
    return this.hostManager.name;
  }

  getChannelKey(channel: Channel | string): string {
    const tag = `channels:${getChannelId(channel)}`;
    return getHostKey(this.hostName, tag);
  }

  get hashKey(): string {
    return getHostKey(this.hostName, 'channels');
  }

  async addChannel(channel: NotificationChannelProps): Promise<Channel> {
    if (!isObject(channel)) {
      throw boom.badRequest('addChannel: channel must be an object');
    }
    let id = channel.id;
    if (!id) {
      id = channel.id = getUniqueId();
    }

    const existing = await this.client.hexists(this.hashKey, id);
    if (existing) {
      throw boom.badRequest(
        `A channel with id "${id}" already exists in host "${this.hostName}"`,
      );
    }

    const result = createChannel(channel) as Channel;
    const data = serializeChannel(channel);

    await Promise.all([
      this.client.hset(this.hashKey, id, JSON.stringify(data)),
      this.bus.emit(ChannelEvents.Added, result.toJSON()),
    ]);

    return result;
  }

  /**
   * Fetch a channel by id
   * @param {string} id
   * @returns {Promise<Rule>}
   */
  async getChannel(id: string): Promise<Channel> {
    const str = await this.client.hget(this.hashKey, id);
    return deserializeFromString(str);
  }

  async channelExists(id: string): Promise<boolean> {
    const resp = await this.client.hexists(this.hashKey, id);
    return !!resp;
  }

  /**
   * Update a Channel
   * @returns {Promise<Channel>}
   * @param channel
   */
  async updateChannel(channel: Channel): Promise<Channel> {
    const id = channel.id;
    if (!id) {
      throw boom.badRequest('Channel should have an id');
    }

    const previous = await this.getChannel(id);
    if (!previous) {
      return this.addChannel(channel);
    }

    // cant change the type of a channel
    if (previous.type !== channel.type) {
      throw boom.badRequest('Cannot change the type of a channel');
    }

    const data = serializeChannel(channel) as Record<string, any>;
    data.updatedAt = systemClock.getTime();

    await Promise.all([
      this.client.hset(this.hashKey, id, JSON.stringify(data)),
      this.bus.emit(ChannelEvents.Updated, data),
      this.emitStatusChange(channel.id, previous.enabled, channel.enabled),
    ]);

    return channel;
  }

  private async emitStatusChange(
    id: string,
    wasActive: boolean,
    isActive: boolean,
  ): Promise<boolean> {
    if (wasActive !== isActive) {
      const eventName = isActive
        ? ChannelEvents.Enabled
        : ChannelEvents.Disabled;

      await this.bus.emit(eventName, { id: id });
      return true;
    }
    return false;
  }

  /**
   * Change a {@link Channel}'s ACTIVE status
   * @param {Channel|string} channel
   * @param {Boolean} isActive
   * @return {Promise<Boolean>}
   */
  async setChannelStatus(
    channel: Channel | string,
    isActive: boolean,
  ): Promise<boolean> {
    const id = getChannelId(channel);
    const prev = await this.getChannel(id);
    if (!prev) {
      throw boom.notFound(`Channel "${id}" not found`);
    }
    if (isActive !== prev.enabled) {
      prev.enabled = isActive;
      await this.updateChannel(prev);
      return true;
    }
    return false;
  }

  async deleteChannel(channel: Channel | string): Promise<boolean> {
    const id = getChannelId(channel);
    const response = await this.client.hdel(this.hashKey, id);
    if (!!response) {
      await this.bus.emit(ChannelEvents.Deleted, { id });
    }
    return !!response;
  }

  /**
   * Return channels from storage
   * @return {Promise<[Channel]>}
   */
  async getChannels(): Promise<Channel[]> {
    const hash = await this.client.hgetall(this.hashKey);
    const result: Channel[] = [];
    Object.values(hash).forEach((str: string) => {
      const channel = deserializeFromString(str);
      channel && result.push(channel);
    });
    return result;
  }

  async getChannelCount(): Promise<number> {
    return this.client.hlen(this.hashKey);
  }

  // Events
  on(event: ChannelEvents, handler: BusEventHandler): UnsubscribeFn {
    return this.bus.on(event, handler);
  }
}

function getChannelId(channel: Channel | string): string {
  let id;
  if (channel instanceof Channel) {
    id = channel.id;
  } else {
    id = channel;
  }
  if (!id) {
    throw boom.badRequest('Expected a channel or id');
  }
  return id;
}

function serializeChannel(channel): Record<string, any> {
  return isFunction(channel.toJSON) ? channel.toJSON() : channel;
}

function deserializeChannel(data?: any): Channel {
  if (isEmpty(data)) return null;
  data.enabled = parseBool(data?.enabled || 'true');
  return createChannel(data) as Channel;
}

function deserializeFromString(str: string): Channel {
  if (!str) {
    return null;
  }
  try {
    const data = JSON.parse(str);
    return deserializeChannel(data);
  } catch (err) {
    logger.warn(err);
    return null;
  }
}
