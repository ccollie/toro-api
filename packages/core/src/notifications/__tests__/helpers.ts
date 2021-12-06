import { appInfo, env } from '../../config';
import { nanoid } from 'nanoid';
import { NotificationContext } from '../types';

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
