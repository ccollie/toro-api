import { EZContext } from 'graphql-ez';
import { FieldConfig, HostTC } from '../index';
import { HostManager } from '@alpen/core';

export const hosts: FieldConfig = {
  type: HostTC.NonNull.List.NonNull,
  description: 'Get the list of hosts managed by the server instance',
  args: {},
  resolve(_: unknown, args: unknown, { supervisor }: EZContext): HostManager[] {
    return supervisor.hosts;
  },
};
