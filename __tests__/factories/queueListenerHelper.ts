import {
  JobEventData,
  JobFinishedEventData,
  QueueListener,
} from '../../src/server/queues';
import isNumber from 'lodash/isNumber';
import random from 'lodash/random';
import defaultsDeep from 'lodash/defaultsDeep';
import { ManualClock } from '../../src/server/lib';
import { randomString } from '../server/utils';
import { Events } from '../../src/server/metrics';

function ensureJob(data: Record<string, any>, currentTime?: number): void {
  data.job = data.job || Object.create(null);
  let timestamp = data.job.timestamp;
  if (!timestamp) {
    const age = random(100, 60000);
    const now = data.ts || currentTime || Date.now();
    data.job.timestamp = now - age;
  }
  data.job.id = data.job.id || randomString(10);
}

function ensureDurations(
  data: JobFinishedEventData,
  currentTime?: number,
): void {
  const now = data.ts || currentTime || Date.now();
  let latency = data.latency;
  if (!isNumber(latency) || latency <= 0) {
    latency = data.latency = random(10, 2500);
  }
  data.job.finishedOn = now;
  data.job.processedOn = now - latency;
  let wait = data.wait;
  if (!isNumber(wait) || wait < 0) {
    data.wait = data.job.processedOn - data.job.timestamp;
  } else {
    data.job.timestamp = data.job.processedOn - wait;
  }
}

export function createJobEvent(
  event: string,
  data: Record<string, any> = {},
  defaultTs?: number,
): JobEventData {
  ensureJob(data, defaultTs);
  let eventName = event;
  if (eventName.startsWith('job.')) {
    eventName = eventName.substring(4);
  }

  let eventData = {
    ts: defaultTs || Date.now(),
    event: eventName,
    ...data,
  };

  if (!data.job.state) {
    data.job.state = eventName;
  }
  eventData = defaultsDeep({}, eventData, data);
  return eventData as JobEventData;
}

export function createFinishedEvent(
  successful: boolean,
  data: Record<string, any> = {},
  defaultTs?: number,
): JobFinishedEventData {
  const event = createJobEvent(Events.FINISHED, data, defaultTs);
  event.job.state = successful ? 'completed' : 'failed';
  const result: JobFinishedEventData = {
    ...event,
    wait: data.wait ?? -1,
    latency: data.latency ?? 0,
    success: successful,
  };
  ensureDurations(result);

  return result;
}

export class QueueListenerHelper {
  private readonly listener: QueueListener;

  constructor(listener: QueueListener) {
    this.listener = listener;
  }

  advanceTime(delta: number): this {
    (this.listener.clock as ManualClock).advanceBy(delta);
    return this;
  }

  setTime(ts: number | Date): this {
    (this.listener.clock as ManualClock).set(ts);
    return this;
  }

  private get now(): number {
    return this.listener.clock.getTime();
  }

  async postJobEvent(event: string, data: Record<string, any> = {}) {
    const eventData = createJobEvent(event, data, this.now);
    this.setTime(eventData.ts);
    return this.listener.emit(event, eventData);
  }

  async postFinishedEvent(successful: boolean, data: Record<string, any> = {}) {
    const event = createFinishedEvent(successful, data, this.now);
    this.setTime(event.ts);
    return this.listener.emit(Events.FINISHED, event);
  }

  async postFailedEvent(data: Record<string, any> = {}) {
    return this.postJobEvent(Events.FAILED, data);
  }

  async postCompletedEvent(data: Record<string, any> = {}) {
    return this.postJobEvent(Events.COMPLETED, data);
  }
}
