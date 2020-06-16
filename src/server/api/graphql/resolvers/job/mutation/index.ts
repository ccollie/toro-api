import { addJob } from './addJob';
import { addJobSchema } from './addJobSchema';
import { addBulkJobs } from './addBulkJobs';
import { addJobLog } from './addJobLog';
import { deleteJob } from './deleteJob';
import { deleteJobSchema } from './deleteJobSchema';
import { removeRepeatableJobs } from './removeRepeatableJobs';
import { removeRepeatableJobByKey } from './removeRepeatableJobByKey';
import { moveJobToFailed } from './moveJobToFailed';
import { moveJobToDelayed } from './moveJobToDelayed';
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
  addJobSchema,
  addJobLog,
  addBulkJobs,
  deleteJob,
  deleteJobSchema,
  deleteBulkJobs,
  promoteJob,
  promoteBulkJobs,
  moveJobToFailed,
  moveJobToDelayed,
  retryJob,
  retryBulkJobs,
  retryFailedJobs,
  removeRepeatableJobs,
  removeRepeatableJobByKey,
  updateJob,
};
