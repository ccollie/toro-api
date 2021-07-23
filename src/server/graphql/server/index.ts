import { useApolloServerErrors } from '@envelop/apollo-server-errors';
import {
  envelop,
  EnvelopError,
  FormatErrorHandler,
  Plugin,
  useErrorHandler,
  useMaskedErrors,
  useSchema,
} from '@envelop/core';
import { DepthLimitConfig, useDepthLimit } from '@envelop/depth-limit';
import { useDisableIntrospection } from '@envelop/disable-introspection';
import type { AllowedOperations } from '@envelop/filter-operation-type';
import { useFilterAllowedOperations } from '@envelop/filter-operation-type';
import { useParserCache } from '@envelop/parser-cache';
import { useValidationCache } from '@envelop/validation-cache';
import {
  GraphQLError,
  GraphQLSchema,
  Kind,
  OperationDefinitionNode,
} from 'graphql';
import {
  getGraphQLParameters,
  processRequest,
  ProcessRequestResult,
  Request,
  shouldRenderGraphiQL,
} from 'graphql-helix';
import pMap from 'p-map';
import { BaseLogger } from 'pino';

import { ApolloError } from 'apollo-server-errors';
import { Context, ContextFunction, createContext } from '../context';
import { getSchema } from '../index';
import { nanoid } from '@lib/ids';
import logger from '@lib/logger';
import { HostConfig } from '@src/types/config';
import { Supervisor } from '../../supervisor';

export { shouldRenderGraphiQL, Request };

const isDevEnv = process.env.NODE_ENV === 'development';

/**
 * Options for request and response information to include in the log statements
 * output by UseLogger around the execution event
 *
 * @param data - Include response data sent to client.
 * @param operationName - Include operation name.
 * @param requestId - Include the event's requestId, or if none, generate a uuid as an identifier.
 * @param query - Include the query. This is the query or mutation (with fields) made in
 * the request.
 * @param tracing - Include the tracing and timing information.
 * @param userAgent - Include the browser (or client's) user agent.
 */
export type GraphQLLoggerOptions = {
  /**
   * @description Include response data sent to client.
   */
  data?: boolean;

  /**
   * @description Include operation name.
   *
   * The operation name is a meaningful and explicit name for your operation. It is only
   * required in multi-operation documents, but its use is encouraged because it is very
   * helpful for debugging and server-side logging.
   * When something goes wrong (you see errors either in your network logs, or in the logs of
   * your GraphQL server) it is easier to identify a query in your codebase by name instead of
   * trying to decipher the contents.
   * Think of this just like a function name in your favorite programming language.
   *
   * @see https://graphql.org/learn/queries/#operation-name
   */
  operationName?: boolean;

  /**
   * @description Include the event's requestId, or if none, generate a uuid as an identifier.
   *
   * The requestId can be helpful when contacting your deployment provider to resolve issues
   * when encountering errors or unexpected behavior.
   */
  requestId?: boolean;

  /**
   * @description Include the query. This is the query or mutation (with fields) made in
   * the request.
   */
  query?: boolean;

  /**
   * @description Include the tracing and timing information.
   *
   * This will log various performance timings withing the GraphQL event lifecycle
   * (parsing, validating, executing, etc).
   */
  tracing?: boolean;

  /**
   * @description Include the browser (or client's) user agent.
   *
   * This can be helpful to know what type of client made the request to resolve issues
   * when encountering errors or unexpected behavior.
   */
  userAgent?: boolean;
};

/**
 * Configure the logger used by the GraphQL server.
 *
 * @param logger your logger
 * @param options the GraphQLLoggerOptions such as tracing, operationName, etc
 */
export type LoggerConfig = {
  logger: BaseLogger;
  options?: GraphQLLoggerOptions;
};

/**
 * GraphQLHandlerOptions
 */
export interface GraphQLHandlerOptions {
  /**
   * @description Customize GraphQL Logger
   *
   * Collect resolver timings, and exposes trace data for
   * an individual request under extensions as part of the GraphQL response.
   */
  loggerConfig?: LoggerConfig;

  /**
   * @description  Modify the resolver and global context.
   */
  context?: Context | ContextFunction;

  /**
   *  @description A callback when an unhandled exception occurs. Use this to perform
   *  app cleanup.
   */
  onException?: (e: Error) => void;

  /**
   * T @description he GraphQL Schema
   */
  schema?: GraphQLSchema;

  /**
   *  @description Limit the complexity of the queries solely by their depth.
   *
   * @see https://www.npmjs.com/package/graphql-depth-limit#documentation
   */
  depthLimitOptions?: DepthLimitConfig;

  /**
   * @description  Only allows the specified operation types (e.g. subscription, query or mutation).
   *
   * By default, only allow query and mutation (ie, do not allow subscriptions).
   *
   * @see https://github.com/dotansimha/envelop/tree/main/packages/plugins/filter-operation-type
   */
  allowedOperations?: AllowedOperations;

  /**
   * @description  Custom Envelop plugins
   */
  extraPlugins?: Plugin<any>[];

  /**
   * @description  Customize the GraphiQL Endpoint that appears in the location bar of the
   * GraphQL Playground
   *
   * Defaults to '/graphql' as this value must match the name of the `graphql` function
   * on the api-side.
   *
   */
  graphiQLEndpoint?: string;
}

function errorHandler(errors: Readonly<GraphQLError[]>) {
  for (const error of errors) {
    logger.error(error);
  }
}

/**
 * This Envelop plugin enriches the context on a per-request basis
 * by populating it with the results of a custom function
 * @returns
 */
export const usePopulateContext = (
  populateContextBuilder: NonNullable<GraphQLHandlerOptions['context']>,
): Plugin<Context> => {
  return {
    async onContextBuilding({ context, extendContext }) {
      const populateContext =
        typeof populateContextBuilder === 'function'
          ? await populateContextBuilder({ context })
          : populateContextBuilder;

      extendContext(populateContext);
    },
  };
};

/**
 * This plugin logs every time an operation is being executed and
 * when the execution of the operation is done.
 *
 * It adds information using a child logger from the context
 * such as the operation name, request id, errors, and header info
 * to help trace and diagnose issues.
 *
 * Tracing and timing information can be enabled via the
 * GraphQLHandlerOptions traction option.
 *
 * @see https://www.envelop.dev/docs/plugins/lifecycle
 * @returns
 */
const useLogger = (loggerConfig: LoggerConfig): Plugin<Context> => {
  const logger = loggerConfig.logger;

  const childLogger = logger.child({
    name: 'graphql-server',
  });

  const includeData = loggerConfig?.options?.data;
  const includeOperationName = loggerConfig?.options?.operationName;
  const includeRequestId = loggerConfig?.options?.requestId;
  const includeTracing = loggerConfig?.options?.tracing;
  const includeUserAgent = loggerConfig?.options?.userAgent;
  const includeQuery = loggerConfig?.options?.query;

  return {
    onExecute({ args }) {
      const options = {} as any;
      const rootOperation = args.document.definitions.find(
        (o) => o.kind === Kind.OPERATION_DEFINITION,
      ) as OperationDefinitionNode;

      if (includeOperationName && args.operationName) {
        options['operationName'] =
          args.operationName ||
          rootOperation.name?.value ||
          'Anonymous Operation';
      }

      if (includeQuery) {
        options['query'] = args.variableValues && args.variableValues;
      }

      if (includeRequestId) {
        options['requestId'] =
          args.contextValue.context?.awsRequestId ||
          args.contextValue.request?.['requestId'] ||
          nanoid();
      }

      if (includeUserAgent) {
        options['userAgent'] = args.contextValue.request?.headers['user-agent'];
      }

      const envelopLogger = childLogger.child({
        ...options,
      });

      envelopLogger.info('GraphQL execution started');

      return {
        onExecuteDone({ result }) {
          const options = {} as any;

          if (includeData) {
            options['data'] = result.data;
          }

          if (result.errors && result.errors.length > 0) {
            envelopLogger.error(
              {
                errors: result.errors,
              },
              'GraphQL execution completed with errors:',
            );
          } else {
            if (includeTracing) {
              options['tracing'] = result.extensions?.envelopTracing;
            }

            envelopLogger.info(
              {
                ...options,
              },
              'GraphQL execution completed',
            );
          }
        },
      };
    },
  };
};

/*
 * Prevent unexpected error messages from leaking to the GraphQL clients.
 *
 * Unexpected errors are those that are not Envelop or Apollo errors
 *
 * Note that error masking should come after useApolloServerErrors since the originalError
 * will could become an ApolloError but if not, then should get masked
 **/
export const formatError: FormatErrorHandler = (err) => {
  if (
    !isDevEnv &&
    err.originalError &&
    !(err.originalError instanceof EnvelopError) &&
    !(err.originalError instanceof ApolloError)
  ) {
    return new GraphQLError('Something went wrong.');
  }

  return err;
};

export type GraphQLHandlerResult = ProcessRequestResult<Context, any>;
export type GraphQLHandler = (
  request: Request,
) => Promise<GraphQLHandlerResult>;

/**
 * Creates an Enveloped GraphQL Server.
 *
 * @see https://www.envelop.dev/ for information about envelop
 * @see https://www.envelop.dev/plugins for available envelop plugins
 * ```js
 * export const handler = createGraphQLHandler({ schema, context })
 * ```
 */
export async function createGraphQLHandler(
  hosts: HostConfig[],
  {
    loggerConfig,
    schema,
    context,
    onException,
    extraPlugins,
    depthLimitOptions,
    allowedOperations,
  }: GraphQLHandlerOptions,
): Promise<GraphQLHandler> {
  schema = schema ?? getSchema();

  loggerConfig = loggerConfig ?? {
    logger,
  };

  // Important: Plugins are executed in order of their usage, and inject functionality serially,
  // so the order here matters
  const plugins: Plugin<any>[] = [
    // Simple LRU for caching parse results.
    useParserCache(),
    // Simple LRU for caching validate results.
    useValidationCache(),
    // Simplest plugin to provide your GraphQL schema.
    useSchema(schema),
    useLogger(loggerConfig),
    // Limits the depth of your GraphQL selection sets.
    useDepthLimit({
      maxDepth: (depthLimitOptions && depthLimitOptions.maxDepth) || 10,
      ignore: (depthLimitOptions && depthLimitOptions.ignore) || [],
    }),
    // Only allow execution of specific operation types
    useFilterAllowedOperations(allowedOperations || ['mutation', 'query']),
    // Apollo Server compatible errors.
    // Important: *must* be listed before useMaskedErrors
    useApolloServerErrors(),
    // Prevent unexpected error messages from leaking to the GraphQL clients.
    // Important: *must* be listed after useApolloServerErrors so it can detect if the
    // error is an ApolloError and mask if not
    useMaskedErrors({ formatError }),
  ];

  if (!isDevEnv) {
    plugins.push(useDisableIntrospection());
  }

  if (isDevEnv) {
    plugins.push(useErrorHandler(errorHandler));
  }

  context = context ?? createContext;
  plugins.push(usePopulateContext(context));

  if (extraPlugins && extraPlugins.length > 0) {
    plugins.push(...extraPlugins);
  }

  const createSharedEnvelop = envelop({
    plugins,
    enableInternalTracing: loggerConfig.options?.tracing,
  });

  const supervisor = await Supervisor.getInstance().waitUntilReady();

  if (hosts && hosts.length) {
    await pMap(hosts, (host) => supervisor.registerHost(host), {
      concurrency: 4,
    });
  }

  return async (request: Request): Promise<GraphQLHandlerResult> => {
    const enveloped = createSharedEnvelop({});

    const logger = loggerConfig.logger;

    const { operationName, query, variables } = getGraphQLParameters(request);
    let res: ProcessRequestResult<any, any>;

    try {
      res = await processRequest({
        operationName,
        query,
        variables,
        request,
        validationRules: undefined,
        ...enveloped,
        contextFactory: enveloped.contextFactory,
      });
    } catch (e) {
      logger.error(e);
      onException && onException(e);
    }

    return res;
  };
}
