import pSettle from 'p-settle';
import pMap from 'p-map';
import boom from '@hapi/boom';
import prexit from 'prexit';
import { isString, isNil } from 'lodash';
import { HostManager } from './hostManager';
import { Queue } from 'bullmq';
import { QueueManager, QueueListener } from './queues';
import { NotificationManager } from '../notifications';
import { getKeyRegex } from './keys';
import { formatSnapshot } from './stats/utils';
import { registerDeserializer } from '../redis/streams';
import { packageInfo } from '../packageInfo';
import config from '../config';
import { getHosts } from '../config/host-config';
import { AppInfo } from 'app-info';

// setup stream deserializers
function initStreams(): void {
  const types = ['latency', 'wait'];
  types.forEach((type) => {
    const regExp = getKeyRegex(type);
    registerDeserializer(regExp, formatSnapshot);
  });
}

let _isInit = false;

const hosts = new Map<string, HostManager>();
const queueManagerMap = new WeakMap<Queue, QueueManager>();
let notifications: NotificationManager;

/**
 * A single class which manages all hosts and queues registered
 * with the system
 */
export class Supervisor {
  private static instance: Supervisor;

  private queueManagersById: Map<string, QueueManager>;
  private initialized: Promise<void> = null;

  constructor() {
    this.initialized = this.init().catch((err) => {
      console.log(err);
    });
  }

  async destroy(): Promise<void> {
    await notifications.destroy();
    const dtors = Array.from(hosts.values()).map((x) => () => x.destroy());
    await pSettle(dtors);
    _isInit = false;
    this.initialized = null;
    Supervisor.instance = null;
  }

  public static getInstance(): Supervisor {
    if (!Supervisor.instance) {
      Supervisor.instance = new Supervisor();
    }
    _isInit = true;
    return Supervisor.instance;
  }

  private async init(): Promise<void> {
    const hostConfigs = getHosts();
    const appInfo = Supervisor.getAppInfo();

    notifications = new NotificationManager(appInfo, hostConfigs);

    hostConfigs.forEach((host, index) => {
      const manager = new HostManager(host, notifications);
      hosts.set(host.name, manager);
    });

    await pMap(hosts.values(), (host) => host.waitUntilReady(), {
      concurrency: 4,
    });

    await pMap(hosts.values(), (host) => host.listen(), {
      concurrency: 4,
    });

    _isInit = true;
  }

  getQueueListener(queue: Queue): QueueListener {
    const manager = this.getQueueManager(queue);
    return manager && manager.queueListener;
  }

  getHost(hostName: string): HostManager {
    return hostName && hosts.get(hostName);
  }

  getQueue(hostName: string, name: string): Queue {
    const host = this.getHost(hostName);
    return host && host.getQueue(name);
  }

  getQueueManager(queue: Queue | string): QueueManager {
    if (isNil(queue)) return null;
    if (!this.queueManagersById) {
      this.queueManagersById = new Map<string, QueueManager>();
      this.hosts.forEach((host) => {
        host.queueManagers.forEach((manager) => {
          this.queueManagersById.set(manager.id, manager);
          queueManagerMap.set(manager.queue, manager);
        });
      });
    }
    if (isString(queue)) {
      return this.queueManagersById.get(queue as string);
    }
    return queueManagerMap.get(queue);
  }

  getQueueById(id: string): Queue {
    const manager = this.getQueueManager(id);
    return manager && manager.queue;
  }

  async deleteQueue(queue: Queue | string) {
    const manager = this.getQueueManager(queue);
    if (!manager) {
      let fragment;
      if (isString(queue)) {
        fragment = `id#${queue}`;
      } else if (queue) {
        fragment = `name "${queue.name}"`;
      }
      throw boom.notFound(`no queue found with ${fragment}`);
    }
    const hostManager = this.getHost(manager.host);
    hostManager.removeQueue(manager.queue);

    // TODO: send notification as well as subscription event
    const count = await manager.removeAllQueueData();
    queueManagerMap.delete(manager.queue);
    await manager.destroy();
    return count;
  }

  static getAppInfo(): AppInfo {
    const server = config.getValue('server');
    const env = config.get('env');
    const title = config.getValue('title', 'el toro');
    const brand = config.getValue('brand') || 'GuanimaTech';
    const url = server.host + (server.port ? `:${server.port}` : '');
    return {
      title,
      brand,
      env,
      url,
      version: packageInfo.version,
      author: packageInfo.author,
    };
  }

  get notifications(): NotificationManager {
    return notifications;
  }

  get hosts(): HostManager[] {
    return Array.from(hosts.values());
  }

  waitUntilReady(): Promise<void> {
    return this.initialized;
  }
}

initStreams();
// todo: do in app
prexit(() => {
  if (_isInit) {
    return Supervisor.getInstance().destroy();
  }
});
