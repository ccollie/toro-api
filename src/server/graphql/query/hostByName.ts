import { HostTC, FieldConfig } from '../types';
import { HostManager } from '../../hosts';
import { Supervisor } from '../../monitor';

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
