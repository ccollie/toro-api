const router = require('express').Router({ mergeParams: true });

import { createJob } from './createJob';
import { findJobs } from './findJobs';
import { getById } from './getById';
import { getState } from './getState';
import { getLogs } from './getLogs';
import { promoteJob, retryJob, deleteJob } from './actions';

router.get('/', findJobs);
router.post('/', createJob);

router.get('/:id', getById);
router.patch('/:id', retryJob);
router.delete('/:id', deleteJob);

router.get('/:id/logs', getLogs);
router.get('/:id/state', getState);

router.post('/:id/promote', promoteJob);
router.post('/:id/retry', retryJob);
router.post('/:id/remove', deleteJob);

export default router;
