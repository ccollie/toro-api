import { createBulkMutationHandler } from './utils';

export const bulkDeleteJobs = createBulkMutationHandler('remove', {
  description: 'Bulk deletes a list of jobs by id',
});
