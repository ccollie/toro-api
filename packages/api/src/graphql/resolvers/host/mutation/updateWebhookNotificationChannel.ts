import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../index';
import {
  WebhookNotificationChannelTC,
  WebhookNotificationChannelUpdateTC,
} from '../scalars';
import { updateChannel } from './utils';
import { schemaComposer } from 'graphql-compose';

const UpdateWebhookNotificationChannelInput = schemaComposer.createInputTC({
  name: 'UpdateWebhookNotificationChannelInput',
  fields: {
    hostId: 'ID!',
    channel: WebhookNotificationChannelUpdateTC.NonNull,
  },
});

export const updateWebhookNotificationChannel: FieldConfig = {
  type: WebhookNotificationChannelTC.NonNull,
  args: {
    input: UpdateWebhookNotificationChannelInput.NonNull,
  },
  resolve: async (_, { input }, context: EZContext) => {
    return updateChannel(context, input, 'webhook');
  },
};
