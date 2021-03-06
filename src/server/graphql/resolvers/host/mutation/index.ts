import { mailNotificationChannelAdd } from './mailNotificationChannelAdd';
import { slackNotificationChannelAdd } from './slackNotificationChannelAdd';
import { webhookNotificationChannelAdd } from './webhookNotificationChannelAdd';
import { notificationChannelEnable } from './notificationChannelEnable';
import { notificationChannelDisable } from './notificationChannelDisable';
import { notificationChannelDelete } from './notificationChannelDelete';
import { mailNotificationChannelUpdate } from './mailNotificationChannelUpdate';
import { slackNotificationChannelUpdate } from './slackNotificationChannelUpdate';
import { webhookNotificationChannelUpdate } from './webhookNotificationChannelUpdate';
import { flowAdd } from './flowAdd';

export default {
  flowAdd,
  mailNotificationChannelAdd,
  slackNotificationChannelAdd,
  webhookNotificationChannelAdd,
  notificationChannelEnable,
  notificationChannelDisable,
  notificationChannelDelete,
  mailNotificationChannelUpdate,
  slackNotificationChannelUpdate,
  webhookNotificationChannelUpdate,
};
