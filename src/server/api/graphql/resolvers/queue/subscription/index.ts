import { jobCountsChanged } from './jobCountsChanged';
import { jobErrorRateChanged } from './jobErrorRateChanged';
import { jobRateChanged } from './jobRateChanged';
import { queueStateChanged } from './queueStateChanged';
import { workersCountChanged } from './workersCountChanged';
import { queueJobUpdates } from './queueJobUpdates';
import { latencyPeak, waitTimePeak } from './peakChanged';
import { consecutiveErrorCountChanged } from './consecutiveErrorCountChanged';
import { workersChanged } from './workersChanged';

export const Subscription = {
  jobCountsChanged: {
    subscribe: jobCountsChanged(),
  },
  jobErrorRateChanged: {
    subscribe: jobErrorRateChanged(),
  },
  consecutiveErrorCountChanged: {
    subscribe: consecutiveErrorCountChanged(),
  },
  jobRateChanged: {
    subscribe: jobRateChanged(),
  },
  queueStateChanged: {
    subscribe: queueStateChanged(),
  },
  workersCountChanged: {
    subscribe: workersCountChanged(),
  },
  queueJobUpdates: {
    subscribe: queueJobUpdates(),
  },
  latencyPeak: {
    subscribe: latencyPeak(),
  },
  waitTimePeak: {
    subscribe: waitTimePeak(),
  },
  workersChanged: {
    subscribe: workersChanged(),
  },
};
