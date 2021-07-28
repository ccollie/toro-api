import { ServerAdapter } from '@alpen/api';
import {
  CreateApp,
  ExpressAppOptions,
  ExpressBuildAppOptions,
  EZApp,
} from '@graphql-ez/express';

type ExpressOptionsType = Omit<
  ExpressAppOptions,
  'schema' | 'prepare' | 'buildContext' | 'onAppRegister'
>;

export class ExpressServerAdapter extends ServerAdapter<
  EZApp,
  ExpressOptionsType,
  ExpressBuildAppOptions
> {
  async build(options: ExpressBuildAppOptions): Promise<EZApp> {
    const appOptions = await this.getMergedOptions(this.config);
    const opts = CreateApp(appOptions);
    return opts.buildApp(options);
  }
}
