import { FieldConfig, HostTC } from '../index';
import { HostManager } from '@server/hosts';
import { Supervisor } from '@server/supervisor';

export const hosts: FieldConfig = {
  type: HostTC.NonNull.List.NonNull,
  description: 'Get the list of hosts managed by the server instance',
  args: {},
  resolve(_: unknown, args: unknown, { supervisor }): HostManager[] {
    return (supervisor as Supervisor).hosts;
  },
};
