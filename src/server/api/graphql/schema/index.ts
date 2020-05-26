import boom from '@hapi/boom';
import path from 'path';
import errorFormatter from 'node-error-formatter';
import { makeExecutableSchema } from 'graphql-tools';
import { loadFiles } from '@graphql-toolkit/file-loading';
import { mergeTypeDefs } from '@graphql-toolkit/schema-merging';
import GraphQLJSON, { GraphQLJSONObject } from 'graphql-type-json';
import {
  Duration,
  JobProgress,
  JobRemoveOption,
  GraphQLDateTime,
} from '../scalars';
import { applyMiddleware } from 'graphql-middleware';

const resolvers = {
  JSON: GraphQLJSON,
  JSONObject: GraphQLJSONObject,
  DateTime: GraphQLDateTime,
  Duration,
  JobProgress,
  JobRemoveOption,
};

export interface MutationResponse {
  success: boolean;
  message?: string;
  statusCode?: number;
  stack?: string;
  [key: string]: any;
}

async function mutationErrorMiddleware(
  resolve,
  parent,
  args,
  context,
  info,
): Promise<MutationResponse> {
  try {
    let data = await resolve(parent, args, context, info);
    if (typeof data !== 'object') {
      data = { result: data };
    }
    return { success: true, ...data };
  } catch (err) {
    if (!err.isBoom) {
      const transformed = errorFormatter.create(err);
      err = boom.boomify(err, { statusCode: transformed.statusCode });
    }
    // todo; use boom payload
    return {
      success: false,
      message: err.message,
      statusCode: err.statusCode,
      // todo: stack
    };
  }
}

const middleware = {
  Mutation: mutationErrorMiddleware,
};

const typesArray = loadFiles(path.join(__dirname, './'));
export const typeDefs = mergeTypeDefs(typesArray);

let schema = makeExecutableSchema({
  typeDefs,
  resolvers,
  // https://github.com/apollographql/apollo-server/issues/1075
  resolverValidationOptions: {
    requireResolversForResolveType: false,
  },
});

schema = applyMiddleware(schema, middleware);

export { schema };
