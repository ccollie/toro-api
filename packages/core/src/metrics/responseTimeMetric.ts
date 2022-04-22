import { QueueBasedMetric } from './baseMetric';
import type { JobFinishedEventData } from '../queues';
import { Events } from './constants';
import { MetricTypes } from '../types';
import { JobDurationValuesResult } from '../commands';
import { Queue } from 'bullmq';
import { getJobDurationValues } from '../loaders/job-duration-values';
import { DDSketch } from '@datadog/sketches-js';

export class JobTimingMetric extends QueueBasedMetric {
  get validEvents(): string[] {
    return [Events.COMPLETED];
  }

  handleEvent(event: JobFinishedEventData): void {
    this.update(event.responseTime, event.ts);
  }

  protected async loadDurationValues(
    queue: Queue,
    start: number,
    end: number,
  ): Promise<JobDurationValuesResult> {
    const jobName = this.jobNames?.[0];
    return getJobDurationValues({ queue, start, end, jobName });
  }

  protected updateSketch(sketch: DDSketch, data: number[]): void {
    // todo: stDev
    data.forEach(sketch.accept);
  }

  // todo: pipeline
  protected async storeValue(queue: Queue): Promise<void> {}

  static get unit(): string {
    return 'ms';
  }
}

export class ResponseTimeMetric extends QueueBasedMetric {
  get validEvents(): string[] {
    return [Events.COMPLETED];
  }

  handleEvent(event: JobFinishedEventData): void {
    this.update(event.responseTime, event.ts);
  }

  static get key(): MetricTypes {
    return MetricTypes.Latency;
  }

  static get description(): string {
    return 'Total time spent in the queue';
  }

  static get unit(): string {
    return 'ms';
  }
}

export class ProcessTimeMetric extends QueueBasedMetric {
  get validEvents(): string[] {
    return [Events.COMPLETED];
  }

  handleEvent(event: JobFinishedEventData): void {
    this.update(event.responseTime, event.ts);
  }

  static get key(): MetricTypes {
    return MetricTypes.Latency;
  }

  static get description(): string {
    return 'Total time spent in the worker';
  }

  static get unit(): string {
    return 'ms';
  }
}
