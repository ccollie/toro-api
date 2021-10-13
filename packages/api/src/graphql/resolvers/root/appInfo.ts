import { FieldConfig } from '../index';
import { AppInfo } from '@alpen/core/types';
import { Supervisor } from '@alpen/core/supervisor';
import { schemaComposer } from 'graphql-compose';

const AppInfoTC = schemaComposer.createObjectTC({
  name: 'AppInfo',
  fields: {
    env: {
      type: 'String!',
      description: 'The server environment (development, production, etc)',
    },
    title: {
      type: 'String!',
      description: 'The app title',
    },
    brand: {
      type: 'String',
    },
    version: {
      type: 'String!',
      description: 'The core version',
    },
    author: {
      type: 'String',
    },
  },
});

export const appInfo: FieldConfig = {
  type: AppInfoTC.NonNull,
  description: 'Get general app info',
  resolve(_): AppInfo {
    return Supervisor.getAppInfo();
  },
};
