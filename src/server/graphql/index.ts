import { ApolloServer } from 'apollo-server-express';
import { schema } from './schema';
import { formatGraphqlError } from './errors';
import config from '../config';
import { Supervisor } from '../supervisor';
import { packageInfo } from '../packageInfo';
import { publish, pubsub, createSubscriptionResolver } from './helpers';

const supervisor = Supervisor.getInstance();
const env = config.get('env');

export const context = {
  env,
  supervisor,
  config,
  packageInfo,
  publish,
  pubsub,
  createResolver: createSubscriptionResolver,
};

export function createServer(middleware): ApolloServer {
  const server = new ApolloServer({
    schema,
    // resolvers,
    // mocks: true,
    // mockEntireSchema: true,
    context: () => {
      return { ...context };
    },
    formatError: formatGraphqlError,
  });
  server.applyMiddleware(middleware);
  return server;
}
