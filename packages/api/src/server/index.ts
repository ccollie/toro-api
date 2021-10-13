import {
  EnvelopError,
  FormatErrorHandler,
  Plugin,
  useErrorHandler,
  useMaskedErrors,
} from '@envelop/core';
import { DepthLimitConfig, useDepthLimit } from '@envelop/depth-limit';
import type { AllowedOperations } from '@envelop/filter-operation-type';
import { useFilterAllowedOperations } from '@envelop/filter-operation-type';
import { useApolloServerErrors } from '@envelop/apollo-server-errors';
import { GraphQLError } from 'graphql';
import pMap from 'p-map';

import { ApolloError } from 'apollo-server-errors';
import { getSchema, publish, pubsub } from '../graphql';
import { Supervisor } from '@alpen/core/supervisor';
import { loaders } from '@alpen/core/loaders';
import { initLoaders } from '@alpen/core';
import { logger } from '@alpen/core/logger';
import { LoggerConfig, useLogger } from './plugins/logger';
import { HostConfig } from '@alpen/core/hosts';
import { accessors } from '@alpen/core/supervisor';
import {
  AppOptions,
  BuildAppOptions,
  BuildContextArgs,
  CacheOptions,
  EZPlugin,
  InferContext,
  NullableEnvelopPlugin,
} from 'graphql-ez';
import { AltairOptions, ezAltairIDE } from '@graphql-ez/plugin-altair';
import {
  AutomaticPersistedQueryOptions,
  createLRUStore,
  ezAutomaticPersistedQueries,
} from '@graphql-ez/plugin-automatic-persisted-queries';
import type { PersistedQueryStore } from '@graphql-ez/plugin-automatic-persisted-queries';
import ms from 'ms';
import boom from '@hapi/boom';

const isDevEnv = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

export type PlaygroundOptions = Omit<AltairOptions, 'endpoint'>;

const INITIAL_GRAPHQL_QUERY = `
 query hostQueues {
    host {
      id
      name
      description
      queues {
        id
        name
        host
        hostId
        prefix
        isPaused
        jobCounts {
          active
          failed
          paused
          completed
          delayed
          waiting
        }
        repeatableJobCount
        jobNames
        workerCount
      }
    }
  }
`;

const DefaultPlaygroundOptions: PlaygroundOptions = {
  path: '/graphql',
  initialQuery: INITIAL_GRAPHQL_QUERY,
};

export type PersistedQueryOptions =
  | boolean
  | {
      /**
       * Specified in **milliseconds**, this time-to-live (TTL) value limits the lifespan
       * of how long the persisted query should be cached.  To specify a desired
       * lifespan of "infinite", set this to `null`, in which case the eviction will
       * be determined by the cache's eviction policy.
       */
      ttl?: number;
      maxItems: number;
    }
  | {
      cache: PersistedQueryStore;
    };

function initPersistedQueries(
  options: PersistedQueryOptions,
  plugins: EZPlugin[],
): void {
  const resolvedOptions: AutomaticPersistedQueryOptions = {};

  if (!options) return;
  if (typeof options === 'boolean') {
    if (!options) return;
  } else if ('cache' in options && !!options.cache) {
    resolvedOptions.store = options.cache;
  } else if ('maxItems' in options && typeof options.maxItems === 'number') {
    const ttl = options.ttl ?? ms('15 mins');
    resolvedOptions.store = createLRUStore(options.maxItems, ttl);
  }
  plugins.push(ezAutomaticPersistedQueries(resolvedOptions));
}

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
   * @description  Manually allow/disallow introspection queries
   *
   * Defaults to false in production and true otherwise
   *
   */
  allowIntrospection?: boolean;

  showPlayground?: boolean;

  playgroundOptions?: PlaygroundOptions;

  cacheOptions?: CacheOptions;

  persistedQueryOptions?: PersistedQueryOptions;
}

function errorHandler(errors: Readonly<GraphQLError[]>) {
  for (const error of errors) {
    logger.error(error);
  }
}

/**
 * Prevent unexpected error messages from leaking to the GraphQL clients.
 *
 * Unexpected errors are those that are not Envelop or Apollo errors
 *
 * Note that error masking should come after useApolloServerErrors since the originalError
 * will could become an ApolloError but if not, then should get masked
 */
export const formatError: FormatErrorHandler = (err): GraphQLError => {
  if (!err) return new GraphQLError('Something went wrong.');
  if (
    !isDevEnv &&
    err instanceof GraphQLError &&
    err.originalError &&
    !(err.originalError instanceof EnvelopError) &&
    !(err.originalError instanceof ApolloError)
  ) {
    return new GraphQLError('Something went wrong.');
  }

  return err as GraphQLError;
};

function buildContext({ req }: BuildContextArgs) {
  const supervisor = Supervisor.getInstance();
  return {
    // IncomingMessage
    req,
    supervisor,
    publish,
    pubsub,
    accessors,
    loaders,
  };
}

declare module 'graphql-ez' {
  interface EZContext extends InferContext<typeof buildContext> {}
}

export function createAppOptions(
  hosts: HostConfig[],
  opts?: GraphQLHandlerOptions,
): AppOptions {
  const schema = getSchema();

  const {
    loggerConfig = { logger },
    extraPlugins,
    depthLimitOptions,
    allowIntrospection,
    cacheOptions,
  } = {
    extraPlugins: [],
    ...(opts ?? {
      cacheOptions: {
        parse: {
          max: 500,
        },
        validation: {
          max: 500,
        },
      },
      persistedQueryOptions: true,
    }),
  };

  // Important: Plugins are executed in order of their usage, and inject functionality serially,
  // so the order here matters
  const plugins: NullableEnvelopPlugin[] = [
    useLogger(loggerConfig),
    // Limits the depth of your GraphQL selection sets.
    useDepthLimit({
      maxDepth: (depthLimitOptions && depthLimitOptions.maxDepth) || 10,
      ignore: (depthLimitOptions && depthLimitOptions.ignore) || [],
    }),
    // Only allow execution of specific operation types
    useFilterAllowedOperations(opts.allowedOperations || ['mutation', 'query']),
    // Apollo Server compatible errors.
    // Important: *must* be listed before useMaskedErrors
    useApolloServerErrors(),
    // Prevent unexpected error messages from leaking to the GraphQL clients.
    // Important: *must* be listed after useApolloServerErrors so it can detect if the
    // error is an ApolloError and mask if not
    useMaskedErrors({ formatError }),
  ];

  if (!isProduction) {
    plugins.push(useErrorHandler(errorHandler));
  }

  if (extraPlugins && extraPlugins.length > 0) {
    plugins.push(...extraPlugins);
  }

  const prepare = async () => {
    const supervisor = await Supervisor.getInstance();
    initLoaders();

    const initHosts =
      hosts && hosts.length
        ? async () => {
            await pMap(hosts, (host) => supervisor.registerHost(host), {
              concurrency: 6,
            });
          }
        : () => Promise.resolve();

    await Promise.all([supervisor.waitUntilReady(), initHosts()]);
  };

  const ezPlugins: EZPlugin[] = [];
  initPersistedQueries(opts.persistedQueryOptions, ezPlugins);

  const options: AppOptions = {
    schema,
    buildContext,
    prepare,
    cache: cacheOptions,
    introspection: {
      disable: !allowIntrospection,
    },
    allowBatchedQueries: 5,
    envelop: {
      plugins,
    },
    ez: {
      plugins: ezPlugins,
    },
  };

  if (opts.showPlayground) {
    const ideOptions = {
      ...DefaultPlaygroundOptions,
      ...(opts.playgroundOptions ?? {}),
    };
    options.ez.plugins.push(ezAltairIDE(ideOptions));
  }

  return options;
}

export type AdapterOptions = GraphQLHandlerOptions & {
  baseUrl?: string;
  hosts?: HostConfig[];
  showPlayground?: boolean;
  playgroundOptions?: PlaygroundOptions;
};

export abstract class ServerAdapter<
  TApp,
  TOptions extends AppOptions,
  TBuildOptions extends BuildAppOptions,
> {
  protected _hosts: HostConfig[] = [];
  protected options: TOptions;
  protected gqlBasePath = '/graphql';
  protected _app: TApp;
  protected readonly config: AdapterOptions;

  constructor(config: AdapterOptions) {
    this._hosts = config.hosts;
    this.config = {
      baseUrl: '',
      loggerConfig: {
        logger,
      },
      ...config,
    };
  }

  protected getMergedOptions(config: AdapterOptions): TOptions {
    const baseOpts = createAppOptions(config.hosts ?? [], config);
    return {
      ...baseOpts,
      ...this.options,
    };
  }

  setOptions(options: TOptions): this {
    this.options = options;
    return this;
  }

  build(options?: TBuildOptions): Promise<TApp> {
    throw boom.notImplemented('build not implemented');
  }

  protected init(): void | Promise<void> {
    //
  }

  protected get baseUrl(): string {
    return this.config.baseUrl;
  }

  protected get uiEndpoint(): string {
    return this.baseUrl || '/';
  }

  protected get gqlEndpoint(): string {
    const base = this.baseUrl;
    if (!base) {
      return this.gqlBasePath;
    } else if (base.endsWith('/')) {
      return base.slice(0, -1) + this.gqlBasePath;
    }
    return base + this.gqlBasePath;
  }
}
