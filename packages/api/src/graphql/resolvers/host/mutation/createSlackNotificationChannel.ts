import { FieldConfig } from '../../index';
import {
  SlackNotificationChannelTC,
  SlackNotificationChannelInputTC,
} from '../scalars';
import { addChannel } from './utils';
import { SlackChannel } from '@alpen/core';
import { schemaComposer } from 'graphql-compose';

const CreateSlackNotificationChannelInput = schemaComposer.createInputTC({
  name: 'SlackNotificationChannelAddInput',
  fields: {
    hostId: 'ID!',
    channel: SlackNotificationChannelInputTC.NonNull,
  },
});

export const createSlackNotificationChannel: FieldConfig = {
  description: 'Create a slack notification channel',
  type: SlackNotificationChannelTC.NonNull,
  args: {
    input: CreateSlackNotificationChannelInput.NonNull,
  },
  resolve: async (_, { input }, context) => {
    return addChannel<SlackChannel>(input, context, 'slack');
  },
};
