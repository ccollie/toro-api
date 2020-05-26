import { jobCountsChanged } from './jobCountsChanged';
import { jobErrorRateChanged } from './jobErrorRateChanged';
import { jobRateChanged } from './jobRateChanged';
import { latencyStatsUpdated } from './latencyStatsUpdated';
import { waitTimeStatsUpdated } from './waitTimeStatsUpdated';
import { queueStateChanged } from './queueStateChanged';
import { workersCountChanged } from './workersCountChanged';

export const Subscription = {
  jobCountsChanged: {
    subscribe: jobCountsChanged(),
  },
  jobErrorRateChanged: {
    subscribe: jobErrorRateChanged(),
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
};
