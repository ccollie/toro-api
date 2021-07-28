import { ServerAdapter } from '@alpen/api';
import {
  CreateApp,
  KoaAppOptions,
  KoaBuildAppOptions,
  EZApp,
} from '@graphql-ez/koa';

type KoaOptionsType = Omit<
  KoaAppOptions,
  'schema' | 'prepare' | 'buildContext' | 'onAppRegister'
>;

export class KoaServerAdapter extends ServerAdapter<
  EZApp,
  KoaOptionsType,
  KoaBuildAppOptions
> {
  async build(options: KoaBuildAppOptions): Promise<EZApp> {
    const appOptions = await this.getMergedOptions(this.config);
    const opts = CreateApp(appOptions);
    return opts.buildApp(options);
  }
}
