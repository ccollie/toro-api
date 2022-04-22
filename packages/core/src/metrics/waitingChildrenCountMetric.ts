import {JobCountMetric, MetricOptions, MetricTypes} from "~/core";

/**
 * A metric tracking the number of jobs currently awaiting children
 */
export class WaitingChildrenCountMetric extends JobCountMetric {
    constructor(options: MetricOptions) {
        super(options, ['waiting-children']);
    }

    static get key(): MetricTypes {
        return MetricTypes.WaitingChildren;
    }

    static get description(): string {
        return 'Jobs awaiting children';
    }
}
