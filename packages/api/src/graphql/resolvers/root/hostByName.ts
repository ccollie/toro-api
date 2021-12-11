import { EZContext } from 'graphql-ez';
import { HostTC, FieldConfig } from '../index';
import { HostManager } from '@alpen/core';

export const hostByName: FieldConfig = {
  type: HostTC,
  description: 'Get a Host by name',
  args: {
    name: 'String!',
  },
  resolve(_: unknown, { name }, { supervisor }: EZContext): HostManager {
    return supervisor.getHost(name);
  },
};
