'use strict';
import prexit from 'prexit';
const router = require('express').Router({ mergeParams: true });
import { Request, Response } from 'express';

let isStopping = false;

const FAILURE_RESPONSE = JSON.stringify({
  status: 'error',
});

function sendFailure(res: Response, options) {
  const { error } = options;

  res.statusCode = 503;
  res.setHeader('Content-Type', 'application/json');
  if (error) {
    return res.end(
      JSON.stringify({
        status: 'error',
        error: error,
        details: error,
      }),
    );
  }
  res.end(FAILURE_RESPONSE);
}

async function checkLiveness(req: Request, res: Response) {
  const { monitor } = req.app.locals.context;
  try {
    if (!isStopping) {
      // todo: make sure all redis servers are up
      await monitor.start();
    }
    res.status(200).send('ok');
  } catch (error) {
    sendFailure(res, { error });
  }
}

async function checkReady(req: Request, res: Response) {
  const { appStart } = req.app.locals;
  res.json({
    status: 'ok',
    appStart,
    uptime: global.process.uptime(),
  });
}

router.get('/', checkReady);
router.get('/liveness', checkLiveness);

prexit(() => {
  isStopping = true;
});

export default router;
