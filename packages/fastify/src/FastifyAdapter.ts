import { ServerAdapter } from '@alpen/api';
import {
  CreateApp,
  FastifyAppOptions,
  BuildAppOptions,
  EZApp,
} from '@graphql-ez/fastify';

type FastifyOptionsType = Omit<
  FastifyAppOptions,
  'schema' | 'prepare' | 'buildContext' | 'onAppRegister'
>;

export class FastifyServerAdapter extends ServerAdapter<
  EZApp,
  FastifyOptionsType,
  BuildAppOptions
> {
  async build(options: BuildAppOptions = {}): Promise<EZApp> {
    const appOptions = await this.getMergedOptions(this.config);
    const opts = CreateApp(appOptions);
    return opts.buildApp(options);
  }
}
