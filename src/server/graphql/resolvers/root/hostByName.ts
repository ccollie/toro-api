import { HostTC, FieldConfig } from '../index';
import { HostManager } from '../../../hosts';
import { Supervisor } from '../../../supervisor';

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
