import { badRequest, notFound } from '@hapi/boom';
import { Queue } from 'bullmq';
import { isNil, parseDuration } from '@alpen/shared';
import ms from 'ms';
import pMap from 'p-map';
import pSettle from 'p-settle';
import prexit from 'prexit';
import { appInfo } from '../config';
import { getHosts, HostConfig, HostManager } from '../hosts';
import { registerHelpers } from '../lib/hbs';
import { logger } from '../logger';
import { QueueListener, QueueManager } from '../queues';
import type { AppInfo } from '../types';

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
  private sweepInterval = 0;

  private queueManagersById: Map<string, QueueManager> = new Map();
  private hostManagerByQueue: Map<string, HostManager> = new Map<
    string,
    HostManager
  >();
  private queueIdMap = new WeakMap<Queue, string>();

  private initialized: Promise<void> = null;

  constructor() {
    this.initialized = this.init().catch((err) => {
      logger.warn(err);
    });
  }

  get hosts(): HostManager[] {
    return Array.from(hosts.values()).sort((a, b) => {
      return a.name === b.name ? 0 : a.name > b.name ? 1 : -1;
    });
  }

  public static getInstance(): Supervisor {
    if (!Supervisor.instance) {
      Supervisor.instance = new Supervisor();
      _isInit = true;
    }
    return Supervisor.instance;
  }

  static getAppInfo(): AppInfo {
    return appInfo;
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

  async registerHost(config: HostConfig): Promise<HostManager> {
    await this.waitUntilReady();
    let manager = this.getHost(config.name);
    if (manager) {
      throw badRequest(`Host "${config.name}" already registered`);
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
    const host = hosts.get(hostName);
    return host ?? this.getHostById(hostName);
  }

  getHostById(id: string): HostManager {
    const values = Array.from(hosts.values());
    return values.find((host) => host.id === id);
  }

  getQueue(hostName: string, prefixOrName: string, name?: string): Queue {
    const host = this.getHost(hostName);
    return host && host.getQueue(prefixOrName, name);
  }

  getQueueManager(queue: Queue | string): QueueManager | null {
    const addToCache = (manager: QueueManager): void => {
      const queue = manager.queue;
      this.queueManagersById.set(manager.id, manager);
      queueManagerMap.set(queue, manager);
    };

    if (isNil(queue)) return null;
    if (!this.queueManagersById.size) {
      this.hosts.forEach((host) => {
        host.queueManagers.forEach(addToCache);
      });
    }
    if (typeof queue === 'string') {
      return this.queueManagersById.get(queue as string) ?? null;
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
    return result || null;
  }

  getQueueById(id: string): Queue {
    const manager = this.getQueueManager(id);
    return manager && manager.queue;
  }

  getQueueId(queue: Queue): string {
    const queueIdMap = this.queueIdMap;
    let id = queueIdMap.get(queue);
    if (!id) {
      const hosts = this.hosts;
      for (let i = 0; i < hosts.length; i++) {
        const managers = hosts[i].queueManagers;
        for (let j = 0; j < managers.length; j++) {
          const manager = managers[j];
          if (queue === manager.queue) {
            id = manager.id;
            queueIdMap.set(queue, id);
            return id;
          }
          // do useful work
          if (!queueIdMap.get(manager.queue)) {
            queueIdMap.set(manager.queue, manager.id);
          }
        }
      }
    }
    return id;
  }

  getQueueHostManager(queueOrId: Queue | string): HostManager | null {
    let result: HostManager | undefined;
    let id: string;
    let mgr: QueueManager | null;

    if (typeof queueOrId === 'string') {
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
    return result ?? null;
  }

  async ensureQueueExists(queueOrId: Queue | string): Promise<void> {
    let queue: Queue;

    if (typeof queueOrId === 'string') {
      queue = this.getQueueById(queueOrId);
      if (!queue) {
        throw notFound(`Queue with id#"${queueOrId}" not found`);
      }
    } else {
      queue = queueOrId as Queue;
    }

    const metaKey = queue.keys.meta;
    const client = await queue.client;
    const queueExists = await client.exists(metaKey);

    if (!queueExists) {
      throw notFound(`Queue "${queue.name}" not found in db`);
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
      if (typeof queue === 'string') {
        fragment = `id#${queue}`;
      } else if (queue) {
        fragment = `name "${queue.name}"`;
      }
      throw notFound(`no queue found with ${fragment}`);
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
        throw badRequest(msgParts.join(''));
      }
    }

    const counts = await queue.getJobCounts();
    const total = Object.values(counts).reduce((res, count) => res + count, 0);

    await this.removeQueue(queue);

    // TODO: send mail notification as well as subscription event
    await manager.removeAllQueueData();
    await manager.destroy();

    return total;
  }

  async waitUntilReady(): Promise<Supervisor> {
    await this.initialized;
    return this;
  }

  private initSweepTimer(): void {
    this.sweepInterval = parseDuration(
      process.env.SWEEP_INTERVAL,
      DEFAULT_SWEEP_INTERVAL,
    );
    this.sweepTimer = setInterval(() => Supervisor.sweep(), this.sweepInterval);
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
}

registerHelpers();

// todo: do in app
prexit(() => {
  if (_isInit) {
    return Supervisor.getInstance().destroy();
  }
});
