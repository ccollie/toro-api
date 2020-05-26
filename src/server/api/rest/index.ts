const router = require('express').Router();
import { Request, Response, NextFunction } from 'express';
const version = require('../../packageInfo').version;
import { info } from './info';
import metricsRoutes from './metrics';
import healthRoutes from './health';
import hostRoutes from './hosts';
import queueRoutes from './queues';

let isInit = false;

function init(req: Request, res: Response, next: NextFunction) {
  if (isInit) {
    return next();
  }
  const { supervisor } = req.app.locals;
  supervisor
    .waitUntilReady()
    .then(() => {
      isInit = true;
      next();
    })
    .catch(next);
}

// for all api rest, make sure were initted
router.use('/', init);

router.use('/version', (req, res) => {
  res.status(200).send(version);
});

router.use('/info', info);
router.use('/hosts', hostRoutes);
router.use('/queues', queueRoutes);
router.use('/health', healthRoutes);
router.use('/metrics', metricsRoutes);

export default router;
