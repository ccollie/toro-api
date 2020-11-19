import { NotificationChannel } from '../../../../../types';
import { HostManager } from '../../../../hosts';
import { NOTIFICATION_CHANNEL_ADDED_PREFIX } from '../../../helpers';

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
