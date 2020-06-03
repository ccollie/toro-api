import { jobCountsChanged } from './jobCountsChanged';
import { jobErrorRateChanged } from './jobErrorRateChanged';
import { jobRateChanged } from './jobRateChanged';
import { latencyStatsUpdated } from './latencyStatsUpdated';
import { waitTimeStatsUpdated } from './waitTimeStatsUpdated';
import { queueStateChanged } from './queueStateChanged';
import { workersCountChanged } from './workersCountChanged';
import { inflightJobUpdated } from './inflightJobUpdated';
import { latencyPeak, waitTimePeak } from './peakChanged';
import { consecutiveErrorCountChanged } from './consecutiveErrorCountChanged';

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
  latencyStatsUpdated: {
    subscribe: latencyStatsUpdated(),
  },
  waitTimeStatsUpdated: {
    subscribe: waitTimeStatsUpdated(),
  },
  queueStateChanged: {
    subscribe: queueStateChanged(),
  },
  workersCountChanged: {
    subscribe: workersCountChanged(),
  },
  inflightJobUpdated: {
    subscribe: inflightJobUpdated(),
  },
  latencyPeak: {
    subscribe: latencyPeak(),
  },
  waitTimePeak: {
    subscribe: waitTimePeak(),
  },
};
