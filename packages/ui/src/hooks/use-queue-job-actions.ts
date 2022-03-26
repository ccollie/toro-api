import { JobState } from '@/types';
import {
  bulkDeleteJobs,
  bulkPromoteJobs,
  bulkRetryJobs,
  cleanQueue,
  getJobs,
  getJobsByFilter,
} from '@/services/queue';
import type { Queue, QueueJobActions } from '@/types';

// move this to store ??
export function useQueueJobActions(queueId: Queue['id']): QueueJobActions {
  async function cleanJobs(status: JobState, grace = 0, limit?: number): Promise<number> {
    return cleanQueue(queueId, grace, limit, status);
  }

  const actions: QueueJobActions = {
    bulkDeleteJobs: (ids: string[]) => bulkDeleteJobs(queueId, ids),
    bulkRetryJobs: (ids: string[]) => bulkRetryJobs(queueId, ids),
    bulkPromoteJobs: (ids: string[]) => bulkPromoteJobs(queueId, ids),
    cleanJobs,
    getJobs,
    getJobsByFilter,
  };

  return actions;
}
