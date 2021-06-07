import { NotificationContext } from '@src/types';
import config, { getValue } from '@src/server/config';
import { nanoid } from 'nanoid';

export function createNotificationContext(): NotificationContext {
  const env = config.get('env');
  const appInfo = getValue('appInfo');

  return {
    app: appInfo,
    env,
    host: {
      id: nanoid(),
      name: 'test-host',
      uri: 'http:/localhost/hosts/test-host',
    },
  };
}
