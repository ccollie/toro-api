import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../index';
import {
  MailNotificationChannelTC,
  MailNotificationChannelUpdateTC,
} from '../scalars';
import { updateChannel } from './utils';
import { schemaComposer } from 'graphql-compose';

const UpdateMailNotificationChannelInputTC = schemaComposer.createInputTC({
  name: 'UpdateMailNotificationChannelInput',
  fields: {
    hostId: 'ID!',
    channel: MailNotificationChannelUpdateTC.NonNull,
  },
});

export const updateMailNotificationChannel: FieldConfig = {
  type: MailNotificationChannelTC.NonNull,
  args: {
    input: UpdateMailNotificationChannelInputTC.NonNull,
  },
  resolve: async (_, { input }, context: EZContext) => {
    return updateChannel(context, input, 'mail');
  },
};
