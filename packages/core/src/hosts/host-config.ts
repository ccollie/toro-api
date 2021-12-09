import { ConnectionOptions } from 'bullmq';
import { getValue } from '../config';
import * as Joi from 'joi';
import { isString } from 'lodash';
import { parseRedisURI } from '../redis/utils';
import fnv from 'fnv-plus';
import { ConnectionOptionsSchema } from '../validation';
import { ChannelConfig } from '../notifications';

let hostsMap: Record<string, HostConfig>;

export interface QueueConfig {
  /** Unique, system generated id based on host/port/db/queue names */
  id?: string;
  /** Queue names */
  name: string;
  prefix?: string;
  jobTypes?: string[];
  /** Should we keep stats for this queue */
  trackMetrics?: boolean;
  /** Is the queue readonly? If so prevent updates from client */
  isReadonly?: boolean;
}

/** A grouped collection of bull queues on a single redis instance */
export interface HostConfig {
  /** Unique, system generated id based on host/port/db */
  id?: string;
  /** A descriptive names of the host e.g. "e-commerce dev" */
  name: string;
  /** Optional description for UI purposes */
  description?: string;
  /** Default prefix for queues on this host */
  prefix?: string;
  /** Default notification channels for alerts */
  channels?: ChannelConfig[];
  /** If true, discover queues automatically in redis in addition to reading queues from config */
  autoDiscoverQueues?: boolean;
  /**
   * Allow adding queues at runtime
   */
  allowDynamicQueues?: boolean;
  /** Redis connection options */
  connection: ConnectionOptions;
  /** Config information for queues associated with this host */
  queues: QueueConfig[];
}

const queueConfigSchema = Joi.object().keys({
  name: Joi.string().required(),
  prefix: Joi.string().optional(),
  description: Joi.string().optional(),
  jobTypes: Joi.array().items(Joi.string()).single().default([]),
  trackMetrics: Joi.boolean().optional().default(true),
  isReadonly: Joi.boolean().optional().default(true),
});

const channelConfig = Joi.object()
  .keys({
    id: Joi.string()
      .regex(/^[a-zA-Z0-9_\-!@#$]{3,25}$/)
      .required(),
    type: Joi.string().required(),
    name: Joi.string().required(),
  })
  .unknown();

const hostConfigSchema = Joi.object().keys({
  id: Joi.string()
    .regex(/^[a-zA-Z0-9_\-!@#$]{3,25}$/)
    .optional(),
  name: Joi.string().required(),
  prefix: Joi.string().optional().default('bull'),
  description: Joi.string().optional(),
  autoDiscoverQueues: Joi.boolean().default(true).optional(),
  allowDynamicQueues: Joi.boolean().default(false).optional(),
  channels: Joi.array().items(channelConfig).default([]),
  connection: ConnectionOptionsSchema,
  queues: Joi.array().items(queueConfigSchema).default([]),
});

// Generate host and queue ids

function generateHostId(config: HostConfig): string {
  const conn = isString(config.connection)
    ? parseRedisURI(config.connection)
    : config.connection;
  const { db = 0, host = 'localhost', port = 6379 } = (conn as any) || {};
  const toHash = `${host}:${port}:${db}`;
  return fnv.hash(toHash).hex();
}

export function generateQueueId(
  host: HostConfig,
  prefix: string,
  name: string,
): string {
  host.id = host.id || generateHostId(host);
  const toHash = `${host.id}:${prefix}:${name}`;
  return fnv.hash(toHash).hex();
}

export function fixupQueueConfig(
  host: HostConfig,
  queue: QueueConfig,
): QueueConfig {
  if (!queue.prefix && queue.name.includes(':')) {
    const [prefix, name] = queue.name.split(':');
    queue.name = name;
    queue.prefix = prefix;
  }
  if (!queue.prefix) {
    queue.prefix = host.prefix;
  }
  queue.id = generateQueueId(host, queue.prefix, queue.name);
  return queue;
}

// to ease testing
export function parseHostConfig(config: Record<string, any>): HostConfig {
  const { error, value: opts } = hostConfigSchema.validate(config);
  if (error) {
    throw error;
  }
  const configData = opts as Record<string, any>;
  const host = configData as HostConfig;
  host.id = generateHostId(host);

  const queues = host['queues'];
  for (let i = 0; i < queues.length; i++) {
    fixupQueueConfig(host, queues[i]);
  }

  return host;
}

function loadHostConfig(): Record<string, HostConfig> {
  if (!hostsMap) {
    hostsMap = Object.create(null);
    const hosts = getValue('hosts', []);
    if (!hosts || !Array.isArray(hosts) || !hosts.length) {
      // throw
    }
    hosts.forEach((host) => {
      hostsMap[host.name] = parseHostConfig(host);
    });
  }
  return hostsMap;
}

export function getHostConfig(nameOrId: string): HostConfig {
  const map = loadHostConfig();
  let config = map[nameOrId];
  if (!config) {
    const hosts = Object.values(map);
    config = hosts.find((host) => host.id === nameOrId);
  }
  return config;
}

export function getHosts(): HostConfig[] {
  const map = loadHostConfig();
  return Object.values(map);
}

function getQueuePredicate(
  queueName: string,
  prefix?: string,
): (x: QueueConfig) => boolean {
  if (prefix) {
    return (x: QueueConfig) => x.name === queueName && x.prefix === prefix;
  }
  return (x: QueueConfig) => x.name === queueName;
}

export function getQueueConfig(
  hostName: string,
  queueName: string,
  prefix?: string,
): QueueConfig {
  const hostConfig = getHostConfig(hostName);
  if (hostConfig) {
    const predicate = getQueuePredicate(queueName, prefix);
    return hostConfig.queues.find(predicate);
  }
  return null;
}

export function removeQueueConfig(
  hostName: string,
  queueName: string,
  prefix?: string,
): boolean {
  const hostConfig = getHostConfig(hostName);
  if (hostConfig) {
    const predicate = getQueuePredicate(queueName, prefix);
    const queues = hostConfig.queues;
    const index = queues.findIndex(predicate);

    if (index > -1) {
      queues.splice(index, 1);
      return true;
    }
  }
  return false;
}
