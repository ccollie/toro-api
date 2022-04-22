import { JobCountMetric } from './jobCountMetric';
import { MetricOptions, MetricTypes } from '../types';
/**
 * This class tracks the count of pending jobs (the number of jobs waiting to be processed)
 * i.e. jobs in waiting, paused or delayed state
 */
export class PendingCountMetric extends JobCountMetric {
    constructor(props: MetricOptions) {
        super(props, [
            'waiting',
            //  'paused',   // todo: uncomment this when paused is supported
            'delayed',
        ]);
    }

    static get key(): MetricTypes {
        return MetricTypes.PendingCount;
    }

    static get description(): string {
        return 'Pending jobs';
    }
}
