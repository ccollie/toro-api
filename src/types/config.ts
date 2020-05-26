import { RedisOptions } from 'ioredis';

export interface QueueConfig {
  /** Unique, system generated id based on host/port/db */
  id?: string;
  /** Queue name */
  name: string;
  prefix?: string;
  /** Notification channels for alerts */
  notifiers?: string[];
  jobTypes: string[];
}

export type ConnectionOptions = string | RedisOptions;

/* A grouped collection of bull queues on a single redis instance */
export interface HostConfig {
  /** Unique, system generated id based on host/port/db */
  id?: string;
  /** A descriptive name of the host e.g. "e-commerce dev" */
  name: string;
  /** Optional description for UI purposed */
  description?: string;
  /** Default prefix for queues on this host */
  prefix?: string;
  /** Default notification channels for alerts */
  notifiers?: string[];
  /** If true, discover queues automatically in redis in addition to reading queues from config */
  autoDiscoverQueues: boolean;
  connection: ConnectionOptions;
  /** Config information for queues associated with this host */
  queues: QueueConfig[];
}
