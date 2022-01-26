import { Events } from './constants';
import { JobFinishedEventData } from '../queues';
import { round } from '@alpen/shared';
import { MetricTypes, MetricValueType, QueueMetricOptions } from './types';
import { QueueCounterBasedMetric } from './counterBasedMetric';

// todo: can we set initial counts ?
export class ErrorPercentageMetric extends QueueCounterBasedMetric {
  private _successes = 0;
  private _failures = 0;

  constructor(options: QueueMetricOptions) {
    super(options);
  }

  get validEvents(): string[] {
    return [Events.FINISHED];
  }

  get successes(): number {
    return this._successes;
  }

  get failures(): number {
    return this._failures;
  }

  handleEvent(event: JobFinishedEventData): void {
    if (event.success) {
      this._successes++;
    } else {
      this._failures++;
    }
    this.update(this.errorPercentage, event.ts);
  }

  get completed(): number {
    return this._failures + this._successes;
  }

  get errorPercentage(): number {
    if (this.completed > 0) {
      const value = this._failures / this.completed;
      return round(value, 2) * 100;
    }
    return 0;
  }

  static get key(): MetricTypes {
    return MetricTypes.ErrorPercentage;
  }

  static get description(): string {
    return 'Error Percentage';
  }

  static get unit(): string {
    return '%';
  }

  static get type(): MetricValueType {
    return MetricValueType.Rate;
  }
}
