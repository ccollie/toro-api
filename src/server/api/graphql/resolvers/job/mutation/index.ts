import { addJob } from './addJob';
import { addBulkJobs } from './addBulkJobs';
import { addJobLog } from './addJobLog';
import { deleteJob } from './deleteJob';
import { removeRepeatableJobs } from './removeRepeatableJobs';
import { removeRepeatableJobByKey } from './removeRepeatableJobByKey';
import { moveJobToFailed } from './moveJobToFailed';
import { retryFailedJobs } from './retryFailedJobs';
import { updateJob } from './updateJob';

import { createBulkMutationHandler, createMutationHandler } from './utils';

const promoteJob = createMutationHandler('promote');
const retryJob = createMutationHandler('retry');

const retryBulkJobs = createBulkMutationHandler('retry');
const promoteBulkJobs = createBulkMutationHandler('promote');
const deleteBulkJobs = createBulkMutationHandler('remove');

export const Mutation = {
  addJob,
  addJobLog,
  addBulkJobs,
  deleteJob,
  deleteBulkJobs,
  promoteJob,
  promoteBulkJobs,
  moveJobToFailed,
  retryJob,
  retryBulkJobs,
  retryFailedJobs,
  removeRepeatableJobs,
  removeRepeatableJobByKey,
  updateJob,
};
