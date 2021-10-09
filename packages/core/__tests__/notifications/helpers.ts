import { config, getValue } from '../../src/config/index';
import { nanoid } from 'nanoid';
import { NotificationContext } from '../../src/notifications';

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
