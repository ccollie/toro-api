import { getAll } from './getAll';
import { getHostQueues } from './getHostQueues';
import { getQueue } from './getQueue';
import { pauseQueue } from './pauseQueue';
import { resumeQueue } from './resumeQueue';
import { cleanQueue } from './cleanQueue';
import { getJobTypes } from './getJobTypes';
import { getJobCounts } from './getJobCounts';
import { getWorkers } from './getWorkers';
import { getWorkerCount } from './getWorkerCount';
import { retryFailedJobs } from './retryFailedJobs';

import ruleRoutes from './rules';
import jobRoutes from './jobs';
import bulkJobRoutes from './bulk-jobs';
import scheduledJobRoutes from './scheduled-jobs';
import metricsRoutes from './metrics';
import { populateQueue } from '../middleware';

const router = require('express').Router({ mergeParams: true });

router.get('/', getAll);

router.get('/:host', getHostQueues);
router.use('/:host/:queue', populateQueue);

router.get('/:host/:queue', getQueue);
router.post('/:host/:queue/pause', pauseQueue);
router.post('/:host/:queue/resume', resumeQueue);
router.get('/:host/:queue/job-types', getJobTypes);
router.get('/:host/:queue/workers', getWorkers);
router.get('/:host/:queue/worker-count', getWorkerCount);
router.get('/:host/:queue/counts', getJobCounts);

// TODO: Drain

router.post('/:host/:queue/clean', cleanQueue);
router.post('/:host/:queue/retry-all', retryFailedJobs);

router.use('/:host/:queue/metrics', metricsRoutes);
router.use('/:host/:queue/rules', ruleRoutes);
router.use('/:host/:queue/getJobs', jobRoutes);
router.use('/:host/:queue/bulk-getJobs', bulkJobRoutes);
router.use('/:host/:queue/scheduled-getJobs', scheduledJobRoutes);

export default router;
