import { FieldConfig, HostTC } from '../types';
import { HostManager } from '../../hosts';
import { Supervisor } from '../../monitor';

export const hosts: FieldConfig = {
  type: HostTC.List.NonNull,
  description: 'Get the list of hosts managed by the server instance',
  args: {},
  resolve(_: unknown, args: unknown, { supervisor }): HostManager[] {
    return (supervisor as Supervisor).hosts;
  },
};
