import { EZContext } from 'graphql-ez';
import { FieldConfig } from '../../index';
import {
  SlackNotificationChannelTC,
  SlackNotificationChannelUpdateTC,
} from '../scalars';
import { updateChannel } from './utils';
import { schemaComposer } from 'graphql-compose';

const UpdateSlackNotificationChannelInput = schemaComposer.createInputTC({
  name: 'UpdateSlackNotificationChannelInput',
  fields: {
    hostId: 'ID!',
    channel: SlackNotificationChannelUpdateTC.NonNull,
  },
});

export const updateSlackNotificationChannel: FieldConfig = {
  type: SlackNotificationChannelTC.NonNull,
  args: {
    input: UpdateSlackNotificationChannelInput.NonNull,
  },
  resolve: async (_, { input }, context: EZContext) => {
    return updateChannel(context, input, 'slack');
  },
};
