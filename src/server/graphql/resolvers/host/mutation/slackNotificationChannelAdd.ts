import { FieldConfig } from '../../index';
import {
  SlackNotificationChannelTC,
  SlackNotificationChannelInputTC,
} from '../scalars/notifications';
import { addChannel } from './utils';
import { SlackChannel } from '@server/notifications';
import { schemaComposer } from 'graphql-compose';

const SlackNotificationChannelAddInput = schemaComposer.createInputTC({
  name: 'SlackNotificationChannelAddInput',
  fields: {
    hostId: 'ID!',
    channel: SlackNotificationChannelInputTC.NonNull,
  },
});

export const slackNotificationChannelAdd: FieldConfig = {
  description: 'Add a slack notification channel',
  type: SlackNotificationChannelTC.NonNull,
  args: {
    input: SlackNotificationChannelAddInput.NonNull,
  },
  resolve: async (_, { input }, context) => {
    return addChannel<SlackChannel>(input, context, 'slack');
  },
};
