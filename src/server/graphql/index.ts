import { ApolloServer } from 'apollo-server-express';
import { schema } from './schema';
import { formatGraphqlError } from './errors';
import config from '../config';
import { Supervisor } from '../supervisor';
import { packageInfo } from '../packageInfo';
import { publish, pubsub, createSubscriptionResolver } from './helpers';
import { parseBool } from '../lib';

const supervisor = Supervisor.getInstance();
const env = config.get('env');
const debug = parseBool(process.env.DEBUG) && env !== 'production';

export const context = {
  env,
  supervisor,
  config,
  packageInfo,
  publish,
  pubsub,
  createResolver: createSubscriptionResolver,
};

export function createServer(): ApolloServer {
  const server = new ApolloServer({
    schema,
    // resolvers,
    // mocks: true,
    // mockEntireSchema: true,
    context: () => {
      return { ...context };
    },
    formatError: formatGraphqlError,
    debug, // TODO
    subscriptions: {
      onConnect: (connectionParams, webSocket, context) => {
        console.log('Connected!');
      },
      onDisconnect: (webSocket, context) => {
        console.log('Disconnected!');
      },
      path: '/subscriptions',
      // ...other options...
    },
    // tracing: process.env.NODE_ENV !== 'production',
  });
  return server;
}
