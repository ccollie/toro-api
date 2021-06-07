import { FieldConfig } from '../../index';
import {
  SlackNotificationChannelTC,
  SlackNotificationChannelUpdateTC,
} from '../scalars/notifications';
import { updateChannel } from './utils';
import { schemaComposer } from 'graphql-compose';

const SlackNotificationChannelUpdateInputTC = schemaComposer.createInputTC({
  name: 'SlackNotificationChannelUpdateInput',
  fields: {
    hostId: 'ID!',
    channel: SlackNotificationChannelUpdateTC.NonNull,
  },
});

export const slackNotificationChannelUpdate: FieldConfig = {
  type: SlackNotificationChannelTC.NonNull,
  args: {
    input: SlackNotificationChannelUpdateInputTC.NonNull,
  },
  resolve: async (_, { input }) => {
    return updateChannel(input, 'slack');
  },
};
