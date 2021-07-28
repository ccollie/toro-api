import {
  createAppOptions,
  GraphQLHandlerOptions,
  PlaygroundOptions,
} from '../server';
import boom from '@hapi/boom';
import { AppOptions, BuildAppOptions } from 'graphql-ez';
import { logger } from '@alpen/core';
import { HostConfig } from '@alpen/core';

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
    throw boom.notImplemented('buildApp not implemented');
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
