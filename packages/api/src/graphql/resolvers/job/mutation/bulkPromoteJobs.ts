import { createBulkMutationHandler } from './utils';

export const bulkPromoteJobs = createBulkMutationHandler('promote', {
  description: 'Bulk promotes a list of jobs by id',
});
