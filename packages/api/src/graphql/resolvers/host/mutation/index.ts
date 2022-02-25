import { createMailNotificationChannel } from './createMailNotificationChannel';
import { createSlackNotificationChannel } from './createSlackNotificationChannel';
import { createWebhookNotificationChannel } from './createWebhookNotificationChannel';
import { enableNotificationChannel } from './enableNotificationChannel';
import { disableNotificationChannel } from './disableNotificationChannel';
import { deleteNotificationChannel } from './deleteNotificationChannel';
import { updateMailNotificationChannel } from './updateMailNotificationChannel';
import { updateSlackNotificationChannel } from './updateSlackNotificationChannel';
import { updateWebhookNotificationChannel } from './updateWebhookNotificationChannel';

export default {
  createMailNotificationChannel,
  createSlackNotificationChannel,
  createWebhookNotificationChannel,
  enableNotificationChannel,
  disableNotificationChannel,
  deleteNotificationChannel,
  updateMailNotificationChannel,
  updateSlackNotificationChannel,
  updateWebhookNotificationChannel,
};
