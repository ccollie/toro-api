import * as tacos from './tacos';
import * as widgets from './widgets';
import * as encoding from './encoding';
import * as backup from './backup';
import { HostConfig } from '@alpen/core';

export { tacos, widgets, encoding, backup };

export const DemoHosts: HostConfig[] = [
  {
    name: 'Acme-manufacturing-2',
    connection: {
      host: '127.0.0.1',
      port: 6379,
    },
    prefix: 'bull',
    autoDiscoverQueues: true,
    queues: [
      {
        name: 'bb_queue',
        prefix: 'bbq',
        jobTypes: [],
      },
      {
        name: 'suzy_queue',
      },
      {
        name: 'widgets',
      },
      {
        name: 'tacos',
      },
      {
        name: 'backup',
      },
    ],
    channels: [
      {
        id: 'default_hook',
        type: 'webhook',
        name: 'Example Webhook',
        enabled: false,
        url: '127.0.0.1:4000/hook?event={{event}}',
      },
      {
        type: 'mail',
        id: 'secondary_mail',
        name: 'Secondary Email',
        recipients: ['recipient@example.com'],
      },
    ],
  },
];
