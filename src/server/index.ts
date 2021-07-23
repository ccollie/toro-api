import express from 'express';
import serveStatic from 'serve-static';
import cookieParser from 'cookie-parser';
import logger from 'morgan';
import compression from 'compression';
import config from './config';
import path from 'path';
import cors from 'cors';
import ms from 'ms';
import { createGraphQLRouter } from './graphql/server/express';
import bodyParser from 'body-parser';

const app = express();

const port = config.get('port') || 4000;
const env = process.env.NODE_ENV || 'development';

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
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

const publicPath = path.resolve(__dirname, '../dist');
const staticConf = { maxAge: '1hr', etag: true };

app.use(serveStatic(publicPath, staticConf));
const start = Date.now();

console.log('Starting ...');
(async () => {
  app.use('/graphql', await createGraphQLRouter([], {}));
  app.use((req, res) => {
    res.sendStatus(404);
  });
  console.log('Queue monitor started. Starting server');
  app.listen(port, () => {
    console.log(`GraphQL server is running on port ${port}.`);
    const duration = ms(Date.now() - start);
    console.log(`Server startup after ${duration}!`);
    console.log(`🚀 Server ready at localhost:${port}/graphql`);
    // console.log(`🚀 Subscriptions available at ${server.subscriptionsPath}`);
  });
})();
