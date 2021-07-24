import { Request, Response, Router } from 'express';
import { Context } from '@src/server/graphql';
import {
  AdapterRequest,
  AdapterResponse,
  BullMonitor,
  EventStreamResponseHeaders,
  MultipartResponseHeaders,
} from '@src/server/adapter';
import { MultipartResponse, Push } from 'graphql-helix';
import logger from '@src/server/lib/logger';

export class ExpressAdapter extends BullMonitor<Request, Response> {
  public readonly router = Router();

  async init() {
    await super.init();
    this.router.use(this.gqlEndpoint, (req: Request, res: Response) => {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return this.handleResponse(req, res).catch((e) => logger.error(e));
    });
  }

  protected createRequest(req: Request): AdapterRequest {
    return {
      body: req.body,
      headers: req.headers,
      method: req.method,
      query: req.query,
    };
  }

  protected renderPlayground(res: Response, body: string): void {
    res.send(body);
  }

  protected async handleResponse(
    res: Response,
    result: AdapterResponse,
  ): Promise<void> {
    result.headers.forEach(({ name, value }) => res.setHeader(name, value));
    res.status(result.status);
    res.json(result.payload);
  }

  protected async handleMultiPartResponse(
    req: Request,
    res: Response,
    result: MultipartResponse<Context, any>,
  ): Promise<void> {
    res.writeHead(200, MultipartResponseHeaders);

    req.on('close', () => {
      result.unsubscribe();
    });

    await this.sendMultiPartData(result, (data) => res.write(data));
    res.end();
  }

  protected async handleSubscriptionResponse(
    req: Request,
    res: Response,
    result: Push<Context, any>,
  ): Promise<void> {
    res.writeHead(200, EventStreamResponseHeaders);

    req.on('close', () => {
      result.unsubscribe();
    });

    await this.sendEventStreamData(result, (data) => res.write(data));
  }
}
