import { FieldConfig } from '../../index';
import {
  MailNotificationChannelTC,
  MailNotificationChannelInputTC,
} from '../scalars';
import { addChannel } from './utils';
import { MailChannel } from '../../../../notifications';
import { schemaComposer } from 'graphql-compose';

const MailNotificationChannelAddInput = schemaComposer.createInputTC({
  name: 'MailNotificationChannelAddInput',
  fields: {
    hostId: 'ID!',
    channel: MailNotificationChannelInputTC.NonNull,
  },
});

export const mailNotificationChannelAdd: FieldConfig = {
  description: 'Add a mail notification channel',
  type: MailNotificationChannelTC.NonNull,
  args: {
    input: MailNotificationChannelAddInput.NonNull,
  },
  resolve: async (_, { input }, context) => {
    return addChannel<MailChannel>(input, context, 'mail');
  },
};
