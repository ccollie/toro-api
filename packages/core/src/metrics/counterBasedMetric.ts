import { QueueBasedMetric } from './baseMetric';
import { MetricValueType, QueueMetricOptions } from '../types';
import { JobFinishedEventData } from '../queues';

// todp: attemptsMade

export class QueueCounterBasedMetric extends QueueBasedMetric {
    protected internalCount = 0;

    constructor(options: QueueMetricOptions) {
        super(options);
        this._value = 0;
    }

    handleEvent(event: JobFinishedEventData): void {
        this.incr(1, event.ts);
    }

    protected incr(delta = 1, ts?: number): void {
        this.internalCount += delta;
        this.update(this.internalCount, ts);
    }

    reset(ts?: number): void {
        this.internalCount = 0;
        this.update(0, ts);
    }

    static get type(): MetricValueType {
        return MetricValueType.Count;
    }
}
