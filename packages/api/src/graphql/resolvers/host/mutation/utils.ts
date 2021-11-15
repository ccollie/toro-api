import { EZContext } from 'graphql-ez';
import { NOTIFICATION_CHANNEL_ADDED_PREFIX } from '../../../helpers';
import { Channel, HostManager, NotificationChannel } from '@alpen/core';

export function publishCreatedEvent(
  context: EZContext,
  host: HostManager,
  channel: NotificationChannel,
): void {
  const eventName = `${NOTIFICATION_CHANNEL_ADDED_PREFIX}${host.id}`;
  const payload = {
    hostId: host.id,
    channelId: channel.id,
    channelName: channel.name,
    channelType: channel.type,
  };
  context.publish(eventName, payload);
}

export async function addChannel<T extends Channel = Channel>(
  input,
  context: EZContext,
  type: string,
): Promise<T> {
  const { hostId, ...channelConfig } = input;
  const host = context.accessors.getHostById(hostId);
  channelConfig.type = type;
  const channel = await host.notifications.addChannel<T>(channelConfig);
  publishCreatedEvent(context, host, channel);
  return channel;
}

export async function updateChannel(
  context: EZContext,
  input,
  type: string,
): Promise<Channel> {
  const { hostId, ...channel } = input;
  const host = context.accessors.getHostById(hostId);
  channel.type = type;
  return host.notifications.updateChannel(channel);
}
