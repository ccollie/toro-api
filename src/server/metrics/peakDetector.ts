import { StatsWindow } from 'stats';
import Joi from '@hapi/joi';
import windowSchema from './slidingWindowBaseSchema';
import { SignalChangedHandler, StreamingZScore } from './lib';
import { QueueListener } from '../queues';
import { createJobNameFilter } from './lib/utils';

export type PeakDetectorOptions = {
  window?: StatsWindow;
  jobName?: string;
  threshold?: number;
  influence?: number;
  lag?: number;
};

const schema = Joi.object().keys({
  window: windowSchema.optional(),
  jobName: Joi.string().optional(),
  threshold: Joi.number().description('std deviations').positive().default(3.5),
  influence: Joi.number().positive().default(0.5),
  lag: Joi.number().integer().positive().default(0),
});

export class PeakDetector {
  private readonly unsubscribe: Function;
  private implementation: StreamingZScore;

  constructor(
    queueListener: QueueListener,
    field: string,
    options: PeakDetectorOptions,
  ) {
    const window = options.window;
    this.implementation = new StreamingZScore(window, options);
    const filter = createJobNameFilter(options.jobName);
    this.unsubscribe = queueListener.on('job.finished', (data: any) => {
      if (options.jobName && filter(data.job?.name)) {
        const value = data[field];
        this.implementation.update(value);
      }
    });
  }

  destroy(): void {
    this.unsubscribe();
  }

  onPeakDetected(handler: SignalChangedHandler): Function {
    return this.implementation.onSignalChange(handler);
  }
}

export class LatencyPeakDetector extends PeakDetector {
  constructor(queueListener: QueueListener, options: PeakDetectorOptions) {
    super(queueListener, 'latency', options);
  }
}

export class WaitTimePeakDetector extends PeakDetector {
  constructor(queueListener: QueueListener, options: PeakDetectorOptions) {
    super(queueListener, 'wait', options);
  }
}
