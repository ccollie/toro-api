import express from 'express';
import serveStatic from 'serve-static';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import compression from 'compression';
import routes from './api/rest';
import config from './config';
import path from 'path';
import { errorHandler } from './api/rest/middleware';
import http from 'http';
import context from './api/common/context';
import { Supervisor } from '../server/monitor';

import { createServer as createApolloServer } from './api/graphql';

const app = express();

const port = config.getValue('port', 4000);
const env = config.get('env') || 'dev';
const isProd = env === 'production';

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
        // don't compress responses if this request header is present
        return false;
      }

      // fallback to standard compression
      return compression.filter(req, res);
    },
    // threshold is the byte threshold for the response body size
    // before compression is considered, the default is 1kb
    threshold: 0,
  }),
);

app.use(logger(env));
app.use(cookieParser());

const supervisor = Supervisor.getInstance();

app.locals.context = context;
app.locals.supervisor = supervisor;

const middleware = {
  app,
  cors: {
    origin: function (origin, callback) {
      if (OriginWhitelist.indexOf(origin) >= 0 || !origin) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
  },
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

const server = createApolloServer(middleware, context);

app.use('/api', routes);
const publicPath = path.resolve(__dirname, '../dist');
const staticConf = { maxAge: '1hr', etag: true };

app.use(serveStatic(publicPath, staticConf));
app.use(errorHandler);

app.use((req, res) => {
  res.sendStatus(404);
});

const httpServer = http.createServer(app);
server.installSubscriptionHandlers(httpServer);

supervisor
  .waitUntilReady()
  .then(() => {
    console.log('Queue monitor started. Starting server');
    httpServer.listen(port, () => {
      app.locals.appStart = new Date();
      console.log(`App running on port ${port}!`);
    });
  })
  .catch((err) => {
    console.log(err);
  });
