'use strict';
import { HostConfig, QueueConfig } from 'index';
import config from './index';
import Joi from '@hapi/joi';
import { isString } from 'lodash';
import { parseRedisURI } from '../redis/utils';
import fnv from 'fnv-plus';

let hostsMap: Record<string, HostConfig>;

const connectionObjectSchema = Joi.object().keys({
  port: Joi.number().positive().greater(1000).optional().default(6379),
  host: Joi.string(),
  family: Joi.number().positive().default(4),
  connectTimeout: Joi.number().positive().default(10000),
  db: Joi.number().min(0).default(0),
  connectionName: Joi.string().optional().default(null),
  password: Joi.string().optional(),
});

const defaultConnectionObject = {
  port: 6379,
  host: 'localhost',
  db: 0,
  family: 4,
};

const connectionSchema = Joi.alternatives().try(
  Joi.string().uri(),
  connectionObjectSchema,
);

const queueConfigSchema = Joi.object().keys({
  name: Joi.string().required(),
  prefix: Joi.string().optional().default('bull'),
  description: Joi.string().optional(),
  notifiers: Joi.array().items(Joi.string()).optional(),
  jobTypes: Joi.array().items(Joi.string()).single().default([]),
  monitorStats: Joi.boolean().optional().default(true),
});

export const hostConfigSchema = Joi.object().keys({
  id: Joi.string()
    .regex(/^[a-zA-Z0-9_\-!@#$]{3,25}$/)
    .optional(),
  name: Joi.string().required(),
  prefix: Joi.string().optional().default('bull'),
  description: Joi.string().optional(),
  autoDiscoverQueues: Joi.boolean().default(true).optional(),
  notifiers: Joi.array().items(Joi.string()).default([]),
  connection: connectionSchema.default(defaultConnectionObject),
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
  const toHash = `${host.id}:${prefix}:${name}`;
  return fnv.hash(toHash).hex();
}

// to ease testing
export function parseHostConfig(config: any): HostConfig {
  const { error, value: opts } = hostConfigSchema.validate(config);
  if (error) {
    throw error;
  }
  const configData = opts as Record<string, any>;
  const host = configData as HostConfig;
  host.id = generateHostId(host);

  const queues = host['queues'];
  for (let i = 0; i < queues.length; i++) {
    const queue = queues[i];
    if (!queue.prefix) queue.prefix = host.prefix;
    queue.id = generateQueueId(host, queue.prefix, queue.name);
    if (!Array.isArray(queue.notifiers)) {
      queue.notifiers = host.notifiers;
    }
  }

  return host;
}

function loadHostConfig(): Record<string, HostConfig> {
  if (!hostsMap) {
    hostsMap = Object.create(null);
    const hosts = config.getValue('hosts', []);
    if (!hosts || !Array.isArray(hosts) || !hosts.length) {
      // throw
    }
    hosts.forEach((host) => {
      hostsMap[host.name] = parseHostConfig(host);
    });
  }
  return hostsMap;
}

export function getHostConfig(name: string): HostConfig {
  const map = loadHostConfig();
  return map[name];
}

export function getHosts(): HostConfig[] {
  const map = loadHostConfig();
  return Object.values(map);
}

export function getQueueConfig(
  hostName: string,
  queueName: string,
): QueueConfig {
  const hostConfig = getHostConfig(hostName);
  if (hostConfig) {
    return hostConfig.queues.find((x) => x.name === queueName);
  }
  return null;
}
