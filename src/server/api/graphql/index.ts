import { ApolloServer } from 'apollo-server-express';
import { typeDefs } from './schema';
import { resolvers } from './resolvers';
import { pubsub } from './subscription/subscriptionManager';
import { formatGraphqlError } from './errors';
import config from '../../config';

export function createServer(middleware, context = {}): ApolloServer {
  const env = config.get('env') || 'dev';

  const server = new ApolloServer({
    typeDefs,
    resolvers,
    // mocks: true,
    // mockEntireSchema: true,
    context: () => {
      return { pubsub, env, ...context };
    },
    formatError: formatGraphqlError,
  });
  server.applyMiddleware(middleware);
  return server;
}
