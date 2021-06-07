import { NotificationChannel } from '@src/types';
import { HostManager } from '@server/hosts';
import {
  getHostById,
  NOTIFICATION_CHANNEL_ADDED_PREFIX,
} from '../../../helpers';
import { Channel } from '@server/notifications';

export function publishCreatedEvent(
  context: any,
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
  context,
  type: string,
): Promise<T> {
  const { hostId, ...channelConfig } = input;
  const host = getHostById(hostId);
  channelConfig.type = type;
  const channel = await host.notifications.addChannel<T>(channelConfig);
  publishCreatedEvent(context, host, channel);
  return channel;
}

export async function updateChannel(input, type: string): Promise<Channel> {
  const { hostId, ...channel } = input;
  const host = getHostById(hostId);
  channel.type = type;
  return host.notifications.updateChannel(channel);
}
