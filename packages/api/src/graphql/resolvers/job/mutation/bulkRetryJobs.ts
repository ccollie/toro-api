import { createBulkMutationHandler } from './utils';

export const bulkRetryJobs = createBulkMutationHandler('retry', {
  description: 'Bulk retries a list of jobs by id',
});
