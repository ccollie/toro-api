import { Queue } from 'bullmq';
import { parseTimestamp } from '../lib/datetime';
import { QueueBus } from '../queues';
import { getQueueBusKey, getQueueMetaKey, getStatsKey } from '../monitor/keys';
import { StatisticalSnapshot, StatsGranularity } from 'index';

/**
 * Base class for manipulating and querying collected queue stats in redis
 */
export class StatsClientBase {
  readonly queue: Queue;
  readonly bus: QueueBus;

  constructor(queue: Queue, bus: QueueBus) {
    this.queue = queue;
    this.bus = bus;
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  destroy(): any {}

  get busKey(): string {
    return getQueueBusKey(this.queue);
  }

  async getRange<T = any>(key: string, start, end): Promise<T[]> {
    start = parseTimestamp(start);
    end = parseTimestamp(end);
    const client = await this.queue.client;
    const reply = await client.zrange(key, start, end);
    const result = new Array<T>();
    reply.forEach((data) => {
      try {
        const value = JSON.parse(data) as T;
        if (value) {
          result.push(value);
        }
      } catch {}
    });
    return result;
  }

  async getSpan(jobType: string, tag: string, unit?: StatsGranularity) {
    const key = this.getKey(jobType, tag, unit);
    const span = this.call('span', key);
    if (Array.isArray(span)) {
      const [start, end] = span;
      return { start, end };
    }
    return null;
  }

  async getLast(
    jobName: string,
    tag: string,
    unit: StatsGranularity,
  ): Promise<StatisticalSnapshot | null> {
    const key = this.getKey(jobName, tag, unit);
    const [, value] = await this.call('getLast', key);
    if (value) {
      return JSON.parse(value) as StatisticalSnapshot;
    }
    return null;
  }

  async getMeta(): Promise<Record<string, string>> {
    const key = getQueueMetaKey(this.queue);
    const client = await this.queue.client;
    return client.hgetall(key);
  }

  async setMeta(data) {
    const key = getQueueMetaKey(this.queue);
    const client = await this.queue.client;
    return client.hmset(key, data);
  }

  protected async _callStats(
    client,
    method: string,
    key: string,
    ...args
  ): Promise<any> {
    client = client || (await this.queue.client);
    return (client as any).stats(key, this.busKey, method, ...args);
  }

  protected async call(method: string, key: string, ...args): Promise<any> {
    const client = await this.queue.client;
    return this._callStats(client, method, key, ...args);
  }

  getKey(jobType: string, tag: string, unit?: StatsGranularity): string {
    return getStatsKey(null, this.queue, jobType, tag, unit);
  }
}
