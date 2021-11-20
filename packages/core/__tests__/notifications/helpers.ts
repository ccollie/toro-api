import { appInfo, env } from '../../src/config/index';
import { nanoid } from 'nanoid';
import { NotificationContext } from '../../src/notifications';

export function createNotificationContext(): NotificationContext {
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
