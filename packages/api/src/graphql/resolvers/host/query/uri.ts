import { FieldConfig } from '../../utils';
import { HostManager } from '@alpen/core';

export const uri: FieldConfig = {
  type: 'String!',
  resolve: (hostManager: HostManager): string => {
    const options = hostManager.client.options;
    let base: string;
    let host: string;

    if ('host' in options) {
      base = options.host;
      host = options.host;
    }

    if (!host?.includes('://')) {
      if ('tls' in options) {
        const protocol = options.tls ? 'rediss' : 'redis';
        base = `${protocol}://${base}`;
      }
    }
    if ('port' in options && options.port) {
      base = `${base}:${options.port}`;
    }
    if ('db' in options && options.db) {
      base = `${base}/${options.db}`;
    }
    if ('path' in options && options.path) {
      base = `${base}/${options.path}`;
    }
    return base;
  },
};
