import { createBulkMutationHandler } from './utils';

export const jobRemoveBulk = createBulkMutationHandler('remove', {
  description: 'Bulk deletes a list of jobs by id',
});
