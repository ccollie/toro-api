import { HostTC, FieldConfig } from '../index';
import { HostManager } from '@alpen/core/hosts';

export const host: FieldConfig = {
  type: HostTC,
  description: 'Get a Host by id',
  args: {
    id: 'ID!',
  },
  resolve(_: unknown, { id }, { supervisor }): HostManager {
    return supervisor.hosts.find((x) => x.id === id);
  },
};
