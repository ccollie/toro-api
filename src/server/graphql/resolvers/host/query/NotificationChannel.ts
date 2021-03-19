import {
  InputTypeComposer,
  ObjectTypeComposer,
  schemaComposer,
} from 'graphql-compose';
import { Duration, HttpMethod, HttpMethodType } from '../../scalars';

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

function createInputType(
  tc: ObjectTypeComposer<any, any>,
  name: string,
): InputTypeComposer<any> {
  return tc
    .getITC()
    .setTypeName(name)
    .removeField(IgnoredInputFields)
    .addFields({
      hostId: {
        type: 'ID!',
        description: 'the host to add the channel to',
      },
    });
}

export const NotificationChannelTC = schemaComposer.createInterfaceTC({
  name: 'NotificationChannel',
  description:
    'NotificationChannels provide a consistent ways for users to be notified about incidents.',
  fields: BaseFields,
});

export const SlackNotificationChannelTC = schemaComposer.createObjectTC({
  name: 'SlackNotificationChannel',
  description: 'A channel which sends notifications through slack',
  interfaces: [NotificationChannelTC],
  fields: {
    ...BaseFields,
    webhook: {
      type: 'String!',
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
});

export const SlackNotificationChannelInputTC = createInputType(
  SlackNotificationChannelTC,
  'SlackNotificationChannelInput',
);

export const MailNotificationChannelTC = schemaComposer.createObjectTC({
  name: 'MailNotificationChannel',
  description: 'A channel which sends notifications through email',
  interfaces: [NotificationChannelTC],
  fields: {
    ...BaseFields,
    recipients: {
      type: '[String!]!',
      description: 'Emails of notification recipients',
    },
  },
});

export const MailNotificationChannelInputTC = createInputType(
  MailNotificationChannelTC,
  'MailNotificationChannelInput',
);

export const WebhookNotificationChannelTC = schemaComposer.createObjectTC({
  name: 'WebhookNotificationChannel',
  description: 'A channel that posts notifications to a webhook',
  interfaces: [NotificationChannelTC],
  fields: {
    ...BaseFields,
    url: {
      type: 'String!',
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
});

export const WebhookNotificationChannelInputTC = createInputType(
  WebhookNotificationChannelTC,
  'WebhookNotificationChannelInput',
).extendField('method', {
  defaultValue: HttpMethod.POST,
});

NotificationChannelTC.addTypeResolver(
  SlackNotificationChannelTC,
  (value) => value?.type === 'slack',
);

NotificationChannelTC.addTypeResolver(
  MailNotificationChannelTC,
  (value) => value?.type === 'mail',
);

NotificationChannelTC.addTypeResolver(
  WebhookNotificationChannelTC,
  (value) => value?.type === 'webhook',
);
