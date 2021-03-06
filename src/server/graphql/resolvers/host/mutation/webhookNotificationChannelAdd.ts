import { FieldConfig } from '../../index';
import {
  WebhookNotificationChannelTC,
  WebhookNotificationChannelInputTC,
} from '../scalars/notifications';
import { addChannel } from './utils';
import { WebhookChannel } from '@server/notifications';
import { schemaComposer } from 'graphql-compose';

const WebhookNotificationChannelAddInput = schemaComposer.createInputTC({
  name: 'WebhookNotificationChannelAddInput',
  fields: {
    hostId: 'ID!',
    channel: WebhookNotificationChannelInputTC.NonNull,
  },
});

export const webhookNotificationChannelAdd: FieldConfig = {
  description: 'Add a webhook notification channel',
  type: WebhookNotificationChannelTC.NonNull,
  args: {
    input: WebhookNotificationChannelAddInput.NonNull,
  },
  resolve: async (_, { input }, context) => {
    return addChannel<WebhookChannel>(input, context, 'webhook');
  },
};
