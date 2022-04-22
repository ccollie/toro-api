import { MetricOptions, MetricTypes } from '../types';
import {JobCountMetric} from './jobCountMetric';

/**
 * A metric tracking the number of currently FAILED jobs in a queue
 */
export class DelayedCountMetric extends JobCountMetric {
    constructor(options: MetricOptions) {
        super(options, ['delayed']);
    }

    static get key(): MetricTypes {
        return MetricTypes.DelayedJobs;
    }

    static get description(): string {
        return 'Delayed jobs';
    }
}
