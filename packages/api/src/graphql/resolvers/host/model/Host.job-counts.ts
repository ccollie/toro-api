import { get } from '@alpen/shared';
import { FieldConfig } from '../../utils';
import { HostManager } from '@alpen/core';

export const jobCounts: FieldConfig = {
  type: 'JobCounts!',
  description: 'Get job counts for a host',
  async resolve(
    host: HostManager,
    args: unknown,
    ctx: unknown,
    info: unknown,
  ): Promise<Record<string, number>> {
    // get field names/states
    const fields = get(info, 'fieldNodes[0].selectionSet.selections', []);
    const states = fields.map((node) => node.name.value).filter(x => x !== '__typename');
    return host.getJobCounts(states);
  },
};
