import { createBulkMutationHandler } from './utils';

export const jobRetryBulk = createBulkMutationHandler('retry', {
  description: 'Bulk retries a list of jobs by id',
});
