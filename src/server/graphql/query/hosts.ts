import { FieldConfig, HostTC } from '../types';
import { HostManager } from '../../hosts';
import { Supervisor } from '../../supervisor';

export const hosts: FieldConfig = {
  type: HostTC.NonNull.List.NonNull,
  description: 'Get the list of hosts managed by the server instance',
  args: {},
  resolve(_: unknown, args: unknown, { supervisor }): HostManager[] {
    return (supervisor as Supervisor).hosts;
  },
};
