import { FieldConfig } from '../../index';
import {
  WebhookNotificationChannelTC,
  WebhookNotificationChannelInputTC,
} from '../scalars';
import { addChannel } from './utils';
import { WebhookChannel } from '@alpen/core';
import { schemaComposer } from 'graphql-compose';

const CreateWebhookNotificationChannelInput = schemaComposer.createInputTC({
  name: 'CreateWebhookNotificationChannelInput',
  fields: {
    hostId: 'ID!',
    channel: WebhookNotificationChannelInputTC.NonNull,
  },
});

export const createWebhookNotificationChannel: FieldConfig = {
  description: 'Add a webhook notification channel',
  type: WebhookNotificationChannelTC.NonNull,
  args: {
    input: CreateWebhookNotificationChannelInput.NonNull,
  },
  resolve: async (_, { input }, context) => {
    return addChannel<WebhookChannel>(input, context, 'webhook');
  },
};
