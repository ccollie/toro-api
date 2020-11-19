import { createBulkMutationHandler } from './utils';

export const jobPromoteBulk = createBulkMutationHandler('promote', {
  description: 'Bulk promotes a list of jobs by id',
});
