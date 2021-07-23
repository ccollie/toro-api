import express from 'express';
import { renderGraphiQL, shouldRenderGraphiQL } from 'graphql-helix';
import { createGraphQLHandler, GraphQLHandlerOptions } from './index';
import { getSchema } from '../schema';
import { HostConfig } from '@src/types/config';

export async function createGraphQLRouter(
  hosts: HostConfig[],
  options: GraphQLHandlerOptions,
): Promise<any> {
  const handleRequest = await createGraphQLHandler(hosts, {
    schema: getSchema(),
    ...options,
  });

  return async (req: express.Request, res: express.Response) => {
    const request = {
      body: req.body,
      headers: req.headers,
      method: req.method,
      query: req.query,
    };

    if (shouldRenderGraphiQL(request)) {
      res.send(renderGraphiQL());
    } else {
      const result = await handleRequest(request);

      if (result.type === 'RESPONSE') {
        result.headers.forEach(({ name, value }) => res.setHeader(name, value));
        res.status(result.status);
        res.json(result.payload);
      } else if (result.type === 'MULTIPART_RESPONSE') {
        res.writeHead(200, {
          Connection: 'keep-alive',
          'Content-Type': 'multipart/mixed; boundary="-"',
          'Transfer-Encoding': 'chunked',
        });

        req.on('close', () => {
          result.unsubscribe();
        });

        res.write('---');

        await result.subscribe((result) => {
          const chunk = Buffer.from(JSON.stringify(result), 'utf8');
          const data = [
            '',
            'Content-Type: application/json; charset=utf-8',
            'Content-Length: ' + String(chunk.length),
            '',
            chunk,
          ];

          if (result.hasNext) {
            data.push('---');
          }

          res.write(data.join('\r\n'));
        });

        res.write('\r\n-----\r\n');
        res.end();
      } else {
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          Connection: 'keep-alive',
          'Cache-Control': 'no-cache',
        });

        req.on('close', () => {
          result.unsubscribe();
        });

        await result.subscribe((result) => {
          res.write(`data: ${JSON.stringify(result)}\n\n`);
        });
      }
    }
  };
}
