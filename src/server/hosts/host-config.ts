import { HostConfig, QueueConfig } from '../../types';
import { getValue } from '../config';
import Joi from 'joi';
import { isString } from 'lodash';
import { parseRedisURI } from '../redis';
import fnv from 'fnv-plus';
import { ConnectionOptionsSchema } from '../validation/schemas';

let hostsMap: Record<string, HostConfig>;

const queueConfigSchema = Joi.object().keys({
  name: Joi.string().required(),
  prefix: Joi.string().optional(),
  description: Joi.string().optional(),
  jobTypes: Joi.array().items(Joi.string()).single().default([]),
  trackMetrics: Joi.boolean().optional().default(true),
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
