import pSettle from 'p-settle';
import pMap from 'p-map';
import boom from '@hapi/boom';
import prexit from 'prexit';
import { isString, isNil } from 'lodash';
import { Queue } from 'bullmq';
import { QueueManager, QueueListener } from '../queues';
import { logger } from '../lib';
import config from '../config';
import { getHosts, HostManager } from '../hosts';
import { AppInfo, HostConfig } from '@src/types';
import { registerHelpers } from '@lib/hbs';
import ms from 'ms';
import { parseDuration } from '@lib/datetime';

let _isInit = false;

const hosts = new Map<string, HostManager>();
const queueManagerMap = new WeakMap<Queue, QueueManager>();

export type QueueDeleteOptions = {
  checkExists: boolean;
  checkActivity?: boolean;
};

const DEFAULT_SWEEP_INTERVAL = ms('15 mins');

/**
 * A single class which manages all hosts and queues registered
 * with the system
 */
export class Supervisor {
  private static instance: Supervisor;
  private sweepTimer: NodeJS.Timer;
  private sweepInterval: number;

  private queueManagersById: Map<string, QueueManager>;
  private hostManagerByQueue: Map<string, HostManager> = new Map<
    string,
    HostManager
  >();

  private initialized: Promise<void> = null;

  constructor() {
    this.initialized = this.init().catch((err) => {
      logger.warn(err);
    });
  }

  async destroy(): Promise<void> {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer);
      this.sweepTimer = null;
    }
    const dtors = Array.from(hosts.values()).map((x) => () => x.destroy());
    await pSettle(dtors);
    _isInit = false;
    this.initialized = null;
    Supervisor.instance = null;
  }

  public static getInstance(): Supervisor {
    if (!Supervisor.instance) {
      Supervisor.instance = new Supervisor();
      _isInit = true;
    }
    return Supervisor.instance;
  }

  private initSweepTimer(): void {
    this.sweepInterval = parseDuration(
      process.env.SWEEP_INTERVAL,
      DEFAULT_SWEEP_INTERVAL,
    );
    this.sweepTimer = setInterval(() => Supervisor.sweep(), this.sweepInterval);
  }

  /**
   * Run a garbage collection pass over queues
   * @private
   */
  private static sweep(): void {
    hosts.forEach((host) => {
      host.sweep();
    });
  }

  private async init(): Promise<void> {
    const hostConfigs = getHosts();

    hostConfigs.forEach((host) => {
      const manager = new HostManager(host);
      hosts.set(host.name, manager);
    });

    await pMap(hosts.values(), (host) => host.waitUntilReady(), {
      concurrency: 4,
    });

    await pMap(hosts.values(), (host) => host.listen(), {
      concurrency: 4,
    });

    this.initSweepTimer();
    _isInit = true;
  }

  async registerHost(config: HostConfig): Promise<HostManager> {
    await this.waitUntilReady();
    let manager = this.getHost(config.name);
    if (manager) {
      throw boom.badRequest(`Host "${config.name}" already registered`);
    }
    manager = new HostManager(config);
    hosts.set(config.name, manager);

    await manager.waitUntilReady();
    await manager.listen();

    return manager;
  }

  getQueueListener(queue: Queue | string): QueueListener {
    return this.getQueueManager(queue)?.queueListener;
  }

  getHost(hostName: string): HostManager {
    return hostName && hosts.get(hostName);
  }

  getHostById(id: string): HostManager {
    const values = Array.from(hosts.values());
    return values.find((host) => host.id === id);
  }

  getQueue(hostName: string, prefixOrName: string, name?: string): Queue {
    const host = this.getHost(hostName);
    return host && host.getQueue(prefixOrName, name);
  }

  getQueueManager(queue: Queue | string): QueueManager {
    const addToCache = (manager: QueueManager): void => {
      const queue = manager.queue;
      this.queueManagersById.set(manager.id, manager);
      queueManagerMap.set(queue, manager);
    };

    if (isNil(queue)) return null;
    if (!this.queueManagersById) {
      this.queueManagersById = new Map<string, QueueManager>();
      this.hosts.forEach((host) => {
        host.queueManagers.forEach(addToCache);
      });
    }
    if (isString(queue)) {
      return this.queueManagersById.get(queue as string);
    }

    let result = queueManagerMap.get(queue);
    if (!result) {
      // Hacky. Fix later
      // this happens if we add a queue after the cache is constructed
      const hosts = this.hosts;
      for (let i = 0; i < hosts.length; i++) {
        const host = hosts[i];
        result = host.queueManagers.find((manager) => manager.queue === queue);
        if (result) {
          addToCache(result);
          break;
        }
      }
    }
    return result;
  }

  getQueueById(id: string): Queue {
    const manager = this.getQueueManager(id);
    return manager && manager.queue;
  }

  getQueueHostManager(queueOrId: Queue | string): HostManager {
    let result: HostManager;
    let id: string;
    let mgr: QueueManager;

    if (isString(queueOrId)) {
      result = this.hostManagerByQueue.get(queueOrId);
      id = queueOrId;
    } else {
      mgr = this.getQueueManager(queueOrId);
      if (!mgr) return null; // should not happen !
      id = mgr.id;
      result = this.hostManagerByQueue.get(id);
    }
    if (!result) {
      const host = this.hosts.find((host) => {
        return !!host.getQueueById(id);
      });
      if (host) {
        this.hostManagerByQueue.set(id, host);
        result = host;
      }
    }
    return result;
  }

  async ensureQueueExists(queueOrId: Queue | string): Promise<void> {
    let queue: Queue;

    if (isString(queueOrId)) {
      queue = this.getQueueById(queueOrId);
      if (!queue) {
        throw boom.notFound(`Queue with id#"${queueOrId}" not found`);
      }
    } else {
      queue = queueOrId as Queue;
    }

    const metaKey = queue.keys.meta;
    const client = await queue.client;
    const queueExists = await client.exists(metaKey);

    if (!queueExists) {
      throw boom.notFound(`Queue "${queue.name}" not found in db`);
    }
  }

  async removeQueue(queue: Queue | string): Promise<boolean> {
    if (!queue) {
      return false;
    }
    const manager = this.getQueueManager(queue);
    if (manager) {
      const hostManager = manager.hostManager;
      if (hostManager) {
        await hostManager.removeQueue(manager.queue);
      }
      this.queueManagersById.delete(manager.id);
      queueManagerMap.delete(manager.queue);
      return true;
    }
    return false;
  }

  async deleteQueue(
    queue: Queue | string,
    options?: QueueDeleteOptions,
  ): Promise<number> {
    const opts = Object.assign(
      { checkExists: false, checkActivity: true },
      options || {},
    );

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
    queue = manager.queue as Queue;

    if (opts.checkExists) {
      await this.ensureQueueExists(queue);
    }

    if (opts.checkActivity) {
      const [actives, workers] = await Promise.all([
        queue.getActiveCount(),
        queue.getWorkers(),
      ]);

      const msgParts: string[] = [`Queue "${queue.name}" has `];

      if (actives > 0) {
        msgParts.push(`${actives} active jobs`);
      }

      if (workers.length > 0) {
        if (msgParts.length > 1) {
          msgParts.push(' and ');
        }
        msgParts.push(`${workers.length} workers`);
      }

      if (msgParts.length > 1) {
        throw boom.badRequest(msgParts.join(''));
      }
    }

    await this.removeQueue(queue);

    // TODO: send mail notification as well as subscription event
    const count = await manager.removeAllQueueData();
    await manager.destroy();
    return count;
  }

  static getAppInfo(): AppInfo {
    return config.get('appInfo');
  }

  get hosts(): HostManager[] {
    return Array.from(hosts.values()).sort((a, b) => {
      return a.name === b.name ? 0 : a.name > b.name ? 1 : -1;
    });
  }

  async waitUntilReady(): Promise<Supervisor> {
    await this.initialized;
    return this;
  }
}

registerHelpers();

// todo: do in app
prexit(() => {
  if (_isInit) {
    return Supervisor.getInstance().destroy();
  }
});
