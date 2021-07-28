import { HostTC, FieldConfig } from '../index';
import { HostManager, Supervisor } from '@alpen/core';

export const hostByName: FieldConfig = {
  type: HostTC,
  description: 'Get a Host by name',
  args: {
    name: 'String!',
  },
  resolve(_: unknown, { name }, { supervisor }): HostManager {
    return (supervisor as Supervisor).getHost(name);
  },
};
