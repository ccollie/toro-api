import {
  InputTypeComposer,
  ObjectTypeComposer,
  schemaComposer,
} from 'graphql-compose';
import {
  Duration,
  HttpMethod,
  HttpMethodType,
  GraphQLEmailAddress,
  GraphQLURL,
} from '../../../scalars';

const BaseFields = {
  id: 'ID!',
  type: {
    type: 'String!',
    description: 'The type of the channel, e.g. slack, email, webhook etc',
  },
  name: {
    type: 'String!',
    description: 'The name of the channel',
  },
  enabled: {
    type: 'Boolean!',
    description: 'Is the channel enabled ?',
  },
  createdAt: {
    type: 'Date',
    description: 'Timestamp of channel creation',
  },
  updatedAt: {
    type: 'Date',
    description: 'Timestamp of last channel update',
  },
};

const IgnoredInputFields = ['id', 'createdAt', 'updatedAt'];
const IgnoredUpdateFields = ['createdAt', 'updatedAt'];

function createInputType(
  tc: ObjectTypeComposer<any, any>,
  name: string,
): InputTypeComposer<any> {
  return tc.getITC().setTypeName(name).removeField(IgnoredInputFields);
}

export function createUpdateType(
  tc: ObjectTypeComposer<any, any>,
  name: string,
): InputTypeComposer<any> {
  return tc.getITC().setTypeName(name).removeField(IgnoredUpdateFields);
}

export const NotificationChannelTC = schemaComposer.createInterfaceTC({
  name: 'NotificationChannel',
  description:
    'NotificationChannels provide a consistent ways for users to be notified about incidents.',
  fields: BaseFields,
});

export const SlackNotificationChannelTC = schemaComposer
  .createObjectTC({
    name: 'SlackNotificationChannel',
    description: 'A channel which sends notifications through slack',
    interfaces: [NotificationChannelTC],
    fields: {
      ...BaseFields,
      webhook: {
        type: GraphQLURL,
        description: 'The slack webhook to post messages to',
      },
      channel: {
        type: 'String',
        description: 'The slack webhook to post messages to',
      },
      token: {
        type: 'String',
        description:
          'A valid slack auth token. Not needed if a webhook is specified',
      },
    },
  })
  .makeFieldNonNull('webhook');

export const SlackNotificationChannelInputTC = createInputType(
  SlackNotificationChannelTC,
  'SlackNotificationChannelInput',
);

export const SlackNotificationChannelUpdateTC = createUpdateType(
  SlackNotificationChannelTC,
  'SlackNotificationChannelUpdate',
);

export const MailNotificationChannelTC = schemaComposer
  .createObjectTC({
    name: 'MailNotificationChannel',
    description: 'A channel which sends notifications through email',
    interfaces: [NotificationChannelTC],
    fields: {
      ...BaseFields,
      recipients: {
        type: [GraphQLEmailAddress],
        description: 'Emails of notification recipients',
      },
    },
  })
  .makeFieldNonNull('recipients');

export const MailNotificationChannelInputTC = createInputType(
  MailNotificationChannelTC,
  'MailNotificationChannelInput',
);

export const MailNotificationChannelUpdateTC = createUpdateType(
  MailNotificationChannelTC,
  'MailNotificationChannelUpdate',
);

export const WebhookNotificationChannelTC = schemaComposer
  .createObjectTC({
    name: 'WebhookNotificationChannel',
    description: 'A channel that posts notifications to a webhook',
    interfaces: [NotificationChannelTC],
    fields: {
      ...BaseFields,
      url: {
        type: GraphQLURL,
        description: 'Url to send data to',
      },
      method: {
        type: HttpMethodType,
        description: 'The HTTP method to use',
      },
      headers: {
        type: 'JSONObject',
        description: 'Optional request headers',
      },
      timeout: {
        type: Duration,
        description:
          'Milliseconds to wait for the server to end the response before aborting the client. ' +
          'By default, there is no timeout.',
      },
      retry: {
        type: 'Int',
        description: 'The number of times to retry the client',
      },
      followRedirect: {
        type: 'Boolean',
        description:
          'Defines if redirect responses should be followed automatically.',
      },
      allowGetBody: {
        type: 'Boolean',
        description:
          'Set this to true to allow sending body for the GET method. ' +
          'This option is only meant to interact with non-compliant servers when you have ' +
          'no other choice.',
      },
      httpSuccessCodes: {
        type: '[Int!]',
        description:
          'Optional success http status codes. Defaults to http codes 200 - 206',
      },
    },
  })
  .makeFieldNonNull('url');

export const WebhookNotificationChannelInputTC = createInputType(
  WebhookNotificationChannelTC,
  'WebhookNotificationChannelInput',
).extendField('method', {
  defaultValue: HttpMethod.POST,
});

export const WebhookNotificationChannelUpdateTC = createUpdateType(
  WebhookNotificationChannelTC,
  'WebhookNotificationChannelUpdate',
).extendField('method', {
  defaultValue: HttpMethod.POST,
});

const isSlackChannel = (value) => value?.type === 'slack';
const isMailChannel = (value) => value?.type === 'mail';
const isWebHookChannel = (value) => value?.type === 'webhook';

NotificationChannelTC.addTypeResolver(
  SlackNotificationChannelTC,
  isSlackChannel,
);

NotificationChannelTC.addTypeResolver(MailNotificationChannelTC, isMailChannel);

NotificationChannelTC.addTypeResolver(
  WebhookNotificationChannelTC,
  isWebHookChannel,
);

export const NotificationChannelUnionTC = schemaComposer
  .createUnionTC({
    name: 'NotificationChannelResult',
    types: [
      MailNotificationChannelTC,
      SlackNotificationChannelTC,
      WebhookNotificationChannelTC,
    ],
  })
  .addTypeResolver(SlackNotificationChannelTC, isSlackChannel)
  .addTypeResolver(WebhookNotificationChannelTC, isWebHookChannel)
  .addTypeResolver(MailNotificationChannelTC, isMailChannel);
