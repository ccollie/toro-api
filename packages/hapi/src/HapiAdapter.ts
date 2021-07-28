import { ServerAdapter } from '@alpen/api';
import {
  CreateApp,
  HapiAppOptions,
  BuildAppOptions,
  EZApp,
} from '@graphql-ez/hapi';

type HapiOptionsType = Omit<
  HapiAppOptions,
  'schema' | 'prepare' | 'buildContext' | 'onAppRegister'
>;

export class HapiServerAdapter extends ServerAdapter<
  EZApp,
  HapiOptionsType,
  BuildAppOptions
> {
  async build(options: BuildAppOptions = {}): Promise<EZApp> {
    const appOptions = await this.getMergedOptions(this.config);
    const opts = CreateApp(appOptions);
    return opts.buildApp(options);
  }
}
