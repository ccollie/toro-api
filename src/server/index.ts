import express from 'express';
import serveStatic from 'serve-static';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import compression from 'compression';
import config from './config';
import path from 'path';
import http from 'http';
import cors from 'cors';
import { Supervisor } from './supervisor';

import { createServer as createApolloServer } from './graphql';
import ms from 'ms';

const app = express();

const port = config.get('port') || 4000;
const env = process.env.NODE_ENV || 'dev';
const isProd = env === 'production';
const isDevelopment = env === 'dev' || env === 'development';

// TODO: get from config ?
const OriginWhitelist = [
  `http://localhost:${port}`,
  'http://localhost:8000',
  'http://localhost:8080',
  'http://localhost:8081',
];

app.use(
  compression({
    // filter decides if the response should be compressed or not,
    // based on the `shouldCompress` function above
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        // don't compress responses if this client header is present
        return false;
      }

      // fallback to standard compression
      return compression.filter(req, res);
    },
    // deviations is the byte deviations for the response body size
    // before compression is considered, the default is 1kb
    threshold: 0,
  }),
);

app.use(logger(env));
app.use(cookieParser());
app.use(cors());

const supervisor = Supervisor.getInstance();

const middleware = {
  app,
  ...(isProd
    ? {}
    : {
        playground: {
          settings: {
            'editor.theme': 'light',
          },
        },
      }),
};

const server = createApolloServer();
server.applyMiddleware(middleware);

const publicPath = path.resolve(__dirname, '../dist');
const staticConf = { maxAge: '1hr', etag: true };

app.use(serveStatic(publicPath, staticConf));

app.use((req, res) => {
  res.sendStatus(404);
});

const httpServer = http.createServer(app);
server.installSubscriptionHandlers(httpServer);

const start = Date.now();
supervisor
  .waitUntilReady()
  .then(() => {
    console.log('Queue monitor started. Starting server');
    httpServer.listen(port, () => {
      const duration = ms(Date.now() - start);
      const addressInfo: any = httpServer.address();
      const port: number = 'port' in addressInfo ? addressInfo.port : null;
      const address: string =
        'address' in addressInfo
          ? addressInfo.address === '::'
            ? 'http://localhost:'
            : addressInfo.address
          : '';

      console.log(`Server startup after ${duration}!`);
      console.log(`🚀 Server ready at ${address}:${port}${server.graphqlPath}`);
      console.log(`🚀 Subscriptions available at ${server.subscriptionsPath}`);
    });
  })
  .catch((err) => {
    console.log(err);
  });
