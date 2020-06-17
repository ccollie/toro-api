import boom from '@hapi/boom';
import { Request, Response, NextFunction } from 'express';
import errorFormatter from 'node-error-formatter';

export const formatError = (err) => {
  return errorFormatter.create(err);
};

export const errorHandler = (
  error,
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!error.isBoom) {
    const transformed = formatError(error);
    error = boom.boomify(error, { statusCode: transformed.statusCode });
  }
  if (error.isServer) {
    // todo: log this and send client generic message
  }
  console.log(error);

  res.status(error.output.statusCode).json(error.output.payload);
};
