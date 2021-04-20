import { FieldConfig } from '../../index';
import {
  WebhookNotificationChannelTC,
  WebhookNotificationChannelUpdateTC,
} from '../scalars';
import { updateChannel } from './utils';
import { schemaComposer } from 'graphql-compose';

const WebhookNotificationChannelUpdateInputTC = schemaComposer.createInputTC({
  name: 'WebhookNotificationChannelUpdateInput',
  fields: {
    hostId: 'ID!',
    channel: WebhookNotificationChannelUpdateTC.NonNull,
  },
});

export const webhookNotificationChannelUpdate: FieldConfig = {
  type: WebhookNotificationChannelTC.NonNull,
  args: {
    input: WebhookNotificationChannelUpdateInputTC.NonNull,
  },
  resolve: async (_, { input }) => {
    return updateChannel(input, 'webhook');
  },
};
