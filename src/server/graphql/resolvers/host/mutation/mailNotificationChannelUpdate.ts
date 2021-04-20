import { FieldConfig } from '../../index';
import {
  MailNotificationChannelTC,
  MailNotificationChannelUpdateTC,
} from '../scalars';
import { updateChannel } from './utils';
import { schemaComposer } from 'graphql-compose';

const MailNotificationChannelUpdateInputTC = schemaComposer.createInputTC({
  name: 'MailNotificationChannelUpdateInput',
  fields: {
    hostId: 'ID!',
    channel: MailNotificationChannelUpdateTC.NonNull,
  },
});

export const mailNotificationChannelUpdate: FieldConfig = {
  type: MailNotificationChannelTC.NonNull,
  args: {
    input: MailNotificationChannelUpdateInputTC.NonNull,
  },
  resolve: async (_, { input }) => {
    return updateChannel(input, 'mail');
  },
};
