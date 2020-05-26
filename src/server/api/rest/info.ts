import { Supervisor } from '../common/imports';
import { Request, Response } from 'express';

export const info = (req: Request, res: Response) => {
  const info = Supervisor.getAppInfo();
  res.json(info);
};
