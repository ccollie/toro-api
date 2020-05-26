import Boom from '@hapi/boom';
import config from '../../../config';
import { Request, Response, NextFunction, RequestHandler } from 'express';

const isProduction = config.get('env') === 'production';

function isNil(val): boolean {
  return val === null || val === undefined;
}

function formatBoomPayload(error) {
  return {
    ...error.output.payload,
    ...(isNil(error.data) ? {} : { data: error.data }),
    ...(!isProduction && error.stack ? { stack: error.stack } : {}),
  };
}

export function asyncHandler(handler): RequestHandler {
  const arity = handler.length;

  return async (req: Request, res: Response, next: NextFunction) => {
    let sent = arity < 3;

    function handleBoom(err: Error) {
      if (err && err instanceof Error && Boom.isBoom(err)) {
        res
          .status((err as Boom).output.statusCode)
          .send(formatBoomPayload(err));
        return true;
      }
      return false;
    }

    function handleDefault(error): void {
      if (!isProduction && (error.stack || error.message)) {
        const status = error.status || 500;
        const message = error.message;
        const err = Boom.boomify(error, { statusCode: status });
        err.output.payload.message = message;
        handleBoom(err);
      } else {
        res.status(500).send(Boom.internal().output.payload);
      }
    }

    function handleNext(err): void {
      if (sent || !err) return;
      console.log(err);
      if (!handleBoom(err)) {
        handleDefault(err);
      }
      sent = true;
    }

    try {
      const result = await handler(req, res, handleNext);
      if (result instanceof Error) {
        handleNext(result);
      } else if (!res.headersSent) {
        const type = typeof result;
        if (type === 'object') {
          res.json(result);
        } else if (type === 'undefined') {
          res.sendStatus(200);
        } else {
          res.send(result);
        }
      }
    } catch (error) {
      sent = false;
      handleNext(error);
    }

    if (!res.headersSent) next();
  };
}
