import { getAll } from './getAll';
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

router.use('/:queue', populateQueue);

router.get('/:queue', getQueue);
router.post('/:queue/pause', pauseQueue);
router.post('/:queue/resume', resumeQueue);
router.get('/:queue/job-types', getJobTypes);
router.get('/:queue/workers', getWorkers);
router.get('/:queue/worker-count', getWorkerCount);
router.get('/:queue/counts', getJobCounts);

// TODO: Drain

router.post('/:queue/clean', cleanQueue);
router.post('/:queue/retry-all', retryFailedJobs);

router.use('/:queue/metrics', metricsRoutes);
router.use('/:queue/rules', ruleRoutes);
router.use('/:queue/getJobs', jobRoutes);
router.use('/:queue/bulk-getJobs', bulkJobRoutes);
router.use('/:queue/scheduled-getJobs', scheduledJobRoutes);

export default router;
