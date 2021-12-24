import { FieldConfig } from '../../index';
import {
  MailNotificationChannelTC,
  MailNotificationChannelInputTC,
} from '../scalars';
import { addChannel } from './utils';
import { MailChannel } from '@alpen/core';
import { schemaComposer } from 'graphql-compose';

const CreateMailNotificationChannelInput = schemaComposer.createInputTC({
  name: 'CreateMailNotificationChannelInput',
  fields: {
    hostId: 'ID!',
    channel: MailNotificationChannelInputTC.NonNull,
  },
});

export const createMailNotificationChannel: FieldConfig = {
  description: 'Add a mail notification channel',
  type: MailNotificationChannelTC.NonNull,
  args: {
    input: CreateMailNotificationChannelInput.NonNull,
  },
  resolve: async (_, { input }, context) => {
    return addChannel<MailChannel>(input, context, 'mail');
  },
};
