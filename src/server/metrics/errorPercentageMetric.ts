import { BaseMetric } from './baseMetric';
import { Events } from './constants';
import { JobFinishedEventData } from '../queues';
import { round } from 'lodash';
import { MetricOptions, MetricTypes } from '../../types';

// todo: can we set initial counts ?
export class ErrorPercentageMetric extends BaseMetric {
  private _successes = 0;
  private _failures = 0;

  constructor(options: MetricOptions) {
    super(options);
  }

  get validEvents(): string[] {
    return [Events.FINISHED];
  }

  handleEvent(event: JobFinishedEventData): void {
    if (event.success) {
      this._successes++;
    } else {
      this._failures++;
    }
    this.update(this.errorPercentage);
  }

  get completed(): number {
    return this._failures + this._successes;
  }

  get errorPercentage(): number {
    return this.completed ? round(this._failures / this.completed, 2) * 100 : 0;
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
}
