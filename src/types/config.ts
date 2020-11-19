import { RedisOptions } from 'ioredis';
import { ChannelConfig } from './notifications';

export interface DiscoveredQueue {
  prefix: string;
  name: string;
}

export interface QueueConfig {
  /** Unique, system generated id based on host/port/db/queue names */
  id?: string;
  /** Queue names */
  name: string;
  prefix?: string;
  jobTypes?: string[];
  /** Should we keep stats for this queue */
  trackMetrics?: boolean;
}

export type ConnectionOptions = string | RedisOptions;

/* A grouped collection of bull queues on a single redis instance */
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
  autoDiscoverQueues: boolean;
  /**
   * Allow adding queues at runtime
   */
  allowDynamicQueues: boolean;
  /* Redis connection options */
  connection: ConnectionOptions;
  /** Config information for queues associated with this host */
  queues: QueueConfig[];
}
