import pMap from 'p-map';
import ms from 'ms';
import LRUCache from 'lru-cache';
import { Channel } from './channel';
import { ChannelStorage } from './channel-storage';
import { HostConfig, HostManager } from '../hosts';
import {
  ChannelConfig,
  NotificationChannel,
  NotificationContext,
} from './types';

function getChannelId(channel: NotificationChannel | string): string {
  if (typeof channel === 'string') return channel;
  return channel?.id;
}

export class NotificationManager {
  private readonly cache: LRUCache;
  private readonly channels: Channel[] = [];
  private readonly hostManager: HostManager;
  private readonly context: NotificationContext;
  private _initialized: Promise<Channel[]> = null;
  private storage: ChannelStorage;

  constructor(hostManager: HostManager) {
    this.hostManager = hostManager;
    this.cache = new LRUCache({
      max: 250,
      maxAge: ms('1 hour'),
    });
    this.storage = new ChannelStorage(hostManager);
    this.context = hostManager.notificationContext;
    this.dispatch = this.dispatch.bind(this);
    this.init();
  }

  get initialized(): Promise<Channel[]> {
    return this._initialized;
  }

  get config(): HostConfig {
    return this.hostManager.config;
  }

  private init(): void {
    if (this._initialized !== null) return;

    this._initialized = this.loadChannels().then((channels) => {
      if (channels.length) return channels;
      // none stored as yet. Bootstrap from config
      // load defaults
      const fromConfig = this.config?.channels || [];
      if (fromConfig.length) {
        return pMap(fromConfig, (channel) => this.addChannel(channel));
      }
    });
  }

  async getChannels(): Promise<Channel[]> {
    await this.initialized;
    return this.channels;
  }

  private async loadChannels(): Promise<Channel[]> {
    const channels = await this.storage.getChannels();
    this.channels.push(...channels);
    return channels;
  }

  async getChannel(id: string): Promise<Channel> {
    // try local
    let channel = this.getLocalChannel(id);
    if (!channel) {
      channel = await this.storage.getChannel(id);
      channel && this.channels.push(channel);
    }
    return channel;
  }

  private getLocalChannelIndex(channel: string | Channel): number {
    let id: string;
    if (typeof channel !== 'string') {
      id = getChannelId(channel);
    } else {
      id = channel;
    }
    return this.channels.findIndex((x) => x.id === id);
  }

  private getLocalChannel(channel: string | Channel): Channel | undefined {
    const idx = this.getLocalChannelIndex(channel);
    return idx === -1 ? undefined : this.channels[idx];
  }

  async addChannel<T = Channel>(channel: ChannelConfig): Promise<T> {
    const result = await this.storage.addChannel(channel);
    result && this.channels.push(result);

    return result as unknown as T;
  }

  // TODO: needs tests
  async updateChannel(channel: Channel): Promise<Channel> {
    const result = await this.storage.updateChannel(channel);
    const localIdx = this.getLocalChannelIndex(channel);
    if (localIdx >= 0) {
      this.channels[localIdx] = result;
    } else {
      this.channels.push(result);
    }
    return result;
  }

  async deleteChannel(channel: Channel | string): Promise<boolean> {
    const isDeleted = await this.storage.deleteChannel(channel);
    if (isDeleted) {
      const idx = this.getLocalChannelIndex(channel);
      if (idx >= 0) {
        this.channels.splice(idx, 1);
      }
    }
    return isDeleted;
  }

  async enableChannel(channel: Channel | string): Promise<boolean> {
    return this.setEnabled(channel, true);
  }

  async disableChannel(channel: Channel | string): Promise<boolean> {
    return this.setEnabled(channel, false);
  }

  protected async setEnabled(
    channel: Channel | string,
    value: boolean,
  ): Promise<boolean> {
    const success = this.storage.setChannelStatus(channel, value);
    if (success) {
      const id = getChannelId(channel);
      const found = await this.getChannel(id);
      const changed = found && found.enabled !== value;
      if (changed) {
        found.enabled = value;
      }
    }
    return success;
  }

  async dispatch(
    event: string,
    data: Record<string, any>,
    channels: string[],
  ): Promise<number> {
    await this.initialized;
    const handlers = channels
      .map((name) => this.channels.find((x) => x.id === name))
      .filter((x) => !!x);

    if (handlers.length) {
      await pMap(handlers, (handler) =>
        handler.dispatch(this.context, data, event),
      );
    }
    return handlers.length;
  }
}
