import { FieldConfig } from '../../utils';
import { HostManager } from '../../../../hosts';

export const hostUri: FieldConfig = {
  type: 'String!',
  resolve: (host: HostManager): string => {
    const options = host.client.options;
    let base = options.host;

    if (!options.host.includes('://')) {
      const protocol = options.tls ? 'rediss' : 'redis';
      base = `${protocol}://${base}`;
    }
    if (options.port) {
      base = `${base}:${options.port}`;
    }
    if (options.db) {
      base = `${base}/${options.db}`;
    }
    if (options.path) {
      base = `${base}/${options.path}`;
    }
    return base;
  },
};
