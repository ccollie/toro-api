import { NullableEnvelopPlugin } from 'graphql-ez';
import { Logger, LevelWithSilent } from '@alpen/core/logger';
import { Kind, OperationDefinitionNode } from 'graphql';
import { nanoid } from '@alpen/core/ids';

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
   * Sets log level for GraphQL logging.
   * This level setting can be different than the one used in api side logging.
   * Defaults to the same level as the logger unless set here.
   *
   * Available log levels:
   *
   * - 'fatal'
   * - 'error'
   * - 'warn'
   * - 'info'
   * - 'debug'
   * - 'trace'
   * - 'silent'
   *
   * The logging level is a __minimum__ level. For instance if `logger.level` is `'info'` then all `'fatal'`, `'error'`, `'warn'`,
   * and `'info'` logs will be enabled.
   *
   * You can pass `'silent'` to disable logging.
   *
   * @default level of the logger set in LoggerConfig
   *
   */
  level?: LevelWithSilent | string;

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
 * Configure the index used by the GraphQL server.
 *
 * @param index your index
 * @param options the GraphQLLoggerOptions such as tracing, operationName, etc
 */
export type LoggerConfig = {
  logger: Logger;
  options?: GraphQLLoggerOptions;
};

/**
 * This plugin logs every time an operation is being executed and
 * when the execution of the operation is done.
 *
 * It adds information using a child index from the context
 * such as the operation name, request id, errors, and header info
 * to help trace and diagnose issues.
 *
 * Tracing and timing information can be enabled via the
 * GraphQLHandlerOptions traction option.
 *
 * @see https://www.envelop.dev/docs/plugins/lifecycle
 * @returns
 */
export const useLogger = (
  loggerConfig: LoggerConfig,
): NullableEnvelopPlugin => {
  const logger = loggerConfig.logger;
  const level = loggerConfig.options?.level || logger.level || 'warn';

  const childLogger = logger.child({
    name: 'graphql-server',
  });

  childLogger.level = level;

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
          args.contextValue.req?.['requestId'] ||
          nanoid();
      }

      if (includeUserAgent) {
        options['userAgent'] = args.contextValue.req?.headers['user-agent'];
      }

      const envelopLogger = childLogger.child({
        ...options,
      });

      envelopLogger.info('GraphQL execution started');

      return {
        onExecuteDone({ result }) {
          const options = {} as any;

          if (includeData) {
            options['data'] = result['data'];
          }

          if (Array.isArray(result['errors']) && result['errors'].length > 0) {
            const errors = result['errors'];
            envelopLogger.error(
              {
                errors,
              },
              'GraphQL execution completed with errors:',
            );
          } else {
            if (includeTracing) {
              options['tracing'] = result['extensions']?.envelopTracing;
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
