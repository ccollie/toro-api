import { Queue } from 'bullmq';
import boom from '@hapi/boom';
import {
  AppInfo,
  HostConfig,
  NotificationContext,
  NotificationHandlerFunc,
} from '@src/types';
import pMap from 'p-map';
import config from '../config';
import * as urlService from '../lib/urlService';
import { isNil } from 'lodash';
import { Notifier, createNotifier } from './notifier';
import { createDebug } from '../lib/debug';

const debug = createDebug('notifications');

const queueMetadata: WeakMap<Queue, QueueMetadata> = new WeakMap<
  Queue,
  QueueMetadata
>();

let notifierConfig: Map<string, Notifier> = null;

class QueueMetadata {
  public host: string;
  public queueUrl: string;
  public handlers: Record<string, NotificationHandlerFunc[]>;
  public disable = true;
}

function createNotifiers() {
  if (notifierConfig) {
    return notifierConfig;
  }
  notifierConfig = new Map();
  const configValues = config.getValue('notifiers', []);
  if (!configValues.length) {
    return notifierConfig;
  }

  configValues.forEach((notifierSpec) => {
    const notifier = createNotifier(notifierSpec);
    if (!notifier.disable) {
      if (notifierConfig.has(notifier.id)) {
        throw boom.badImplementation(
          `Duplicate notifier in config "${notifier.id}`,
        );
      }
    }
    notifierConfig.set(notifier.id, notifier);
  });

  return notifierConfig;
}

function parseNotifierReferences(specs?: string[]): Notifier[] {
  const notFound = (id): void => {
    throw boom.notFound(`No notifier found in config with id "${id}`);
  };

  if (isNil(specs)) {
    return [];
  }

  return specs.map((spec) => {
    const notifier = notifierConfig.get(spec);
    if (!notifier) {
      notFound(spec);
    }
    return notifier;
  });
}

function getQueueConfigs(hosts: HostConfig[]) {
  createNotifiers();

  for (let i = 0; i < hosts.length; i++) {
    const host = hosts[i];
    const queues = host.queues;
    queues.forEach((queue) => {
      const notifiers = parseNotifierReferences(queue.notifiers);

      // skip queues without notifications enabled
      if (!notifiers.length) return;
      const handlers: Record<string, NotificationHandlerFunc[]> = {};

      // copy notification handlers to queue metadata to minimize
      // lookups at runtime. For a particular event, we only need to
      // look at meta.handlers[event]
      notifiers.forEach((notifier) => {
        for (const [event, handler] of Object.entries(notifier.handlers)) {
          handlers[event] = handlers[event] || [];
          handlers[event].push(handler);
        }
      });

      const meta = new QueueMetadata();
      meta.host = host.name;
      meta.handlers = handlers;
      //meta.queueUrl = urlService.getQueueUrl(queue);

      // queueMetadata.set(queue, meta);
    });
  }

  return queueMetadata;
}

export class NotificationManager {
  private readonly context: NotificationContext;
  private readonly cleanups: Function[] = [];

  constructor(appInfo: AppInfo, hosts: HostConfig[]) {
    this.dispatch = this.dispatch.bind(this);
    const env = config.get('env');

    getQueueConfigs(hosts);
    this.context = {
      appInfo,
      config,
      env,
      urlService,
    };
  }

  getEventHandlers(queue: Queue, event: string): NotificationHandlerFunc[] {
    const meta = queueMetadata.get(queue);
    return (meta && meta.handlers[event]) || [];
  }

  async dispatch(
    event: string,
    queue: Queue,
    data: any,
    notifierNames: string[] = null,
  ): Promise<number> {
    let handlers = [];
    const meta = queueMetadata.get(queue);
    if (!notifierNames) {
      handlers = (meta && meta.handlers[event]) || [];
    } else {
      const notifiers = notifierNames
        .map((name) => notifierConfig.get(name))
        .filter((x) => !!x);
      handlers = notifiers.map((x) => x.handlers[event]);
    }

    if (handlers.length) {
      const context = {
        ...this.context,
        host: meta.host,
        event,
        queueUrl: meta.queueUrl,
      };
      await pMap(handlers, (handler) => handler(context, queue, data));
    }
    return handlers.length;
  }

  async destroy(): Promise<void> {
    await pMap(this.cleanups, (fn) => fn()).catch((err) => console.log(err));
  }
}
