import Joi, { ObjectSchema } from '@hapi/joi';
import { createResolver } from '../../../subscription';
import { GraphQLFieldResolver } from 'graphql';
import {
  PeakDetector,
  LatencyPeakDetector,
  WaitTimePeakDetector,
} from '../../../../../monitor';
import { SignalChangedEvent } from '../../../../../metrics/lib';
import windowSchema from '../../../../../metrics/slidingWindowBaseSchema';
import { StatsWindow } from 'stats';
import { getQueueListener } from '../../helpers';

type PeakChangedInput = {
  queueId: string;
  jobName?: string;
  window?: StatsWindow;
  threshold?: number;
  influence?: number;
  lag?: number;
};

const schema = Joi.object().keys({
  queueId: Joi.string().required().description('the queue id'),
  jobName: Joi.string().optional().description('the job name'),
  window: windowSchema.optional(),
  threshold: Joi.number().description('std deviations').positive().default(3.5),
  influence: Joi.number().positive().default(0.5),
  lag: Joi.number().integer().positive().default(0),
});

function peakChanged(field: string): GraphQLFieldResolver<any, any> {
  let detector: PeakDetector;
  let unsubscribe: Function;

  function getChannelName(_, { queueId, jobName }): string {
    return `PEAK_CHANGED:${queueId}:${field}` + (jobName ? `:${jobName}` : '');
  }

  function convertSignal(val: number): string {
    if (val === 1) return 'HIGH';
    if (val === -1) return 'LOW';
    return 'NONE';
  }

  function onSubscribe(_, args: PeakChangedInput, context): void {
    const { queueId, ...options } = args;
    const { channelName, pubsub } = context;
    const queueListener = getQueueListener(context, queueId);

    function handler(event: SignalChangedEvent): Promise<void> {
      return pubsub.publish(channelName, {
        signal: convertSignal(event.signal),
        value: event.value,
        zscore: event.zscore,
      });
    }

    if (field === 'latency') {
      detector = new LatencyPeakDetector(queueListener, options);
    } else {
      detector = new WaitTimePeakDetector(queueListener, options);
    }

    unsubscribe = detector.onPeakDetected(handler);
  }

  async function onUnsubscribe(): Promise<void> {
    detector.destroy();
    unsubscribe();
  }

  return createResolver({
    channelName: getChannelName,
    onSubscribe,
    onUnsubscribe,
  });
}

export function latencyPeak(): GraphQLFieldResolver<any, any> {
  return peakChanged('latency');
}

export function waitTimePeak(): GraphQLFieldResolver<any, any> {
  return peakChanged('wait');
}
