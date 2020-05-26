import { asyncHandler } from '../../middleware';
import { isNumber, parseBool } from '../../../../lib';
import { getRuleManager } from './utils';
import { Request, Response } from 'express';

export const getAlerts = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const client = getRuleManager(req);

  const start = isNumber(req.query.start)
    ? parseInt(req.query.start as string)
    : undefined;
  const end = req.query.end ? String(req.query.end) : undefined;
  const sortAsc = parseBool(req.query.asc || 'true');
  const shouldExport = req.query.export && parseBool(req.query.export);

  const alerts = await client.getRuleAlerts(id, start, end, sortAsc);

  if (shouldExport) {
    const queue = res.locals.queue;

    const stringData = JSON.stringify(alerts, null, 2);

    const filename = `${queue.name}-${id}-alerts.json`;

    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.setHeader('Content-Description', 'Jobs Data Export');
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Pragma', 'no-cache');
    res.send(stringData);

    return;
  }

  res.status(200).json(alerts);
});
