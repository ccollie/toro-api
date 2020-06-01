import { mailNotificationChannelAdd } from './mailNotificationChannelAdd';
import { slackNotificationChannelAdd } from './slackNotificationChannelAdd';
import { webhookNotificationChannelAdd } from './webhookNotificationChannelAdd';
import { notificationChannelEnable} from './notificationChannelEnable';
import { notificationChannelDelete } from './notificationChannelDelete';

export default {
  mailNotificationChannelAdd,
  slackNotificationChannelAdd,
  webhookNotificationChannelAdd,
  notificationChannelEnable,
  notificationChannelDelete
}
