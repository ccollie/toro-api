import { FieldConfig } from '../../utils';
import { HostManager } from '@alpen/core';
import { RuleScripts } from '@alpen/core';

export const hostAlertCount: FieldConfig = {
  type: 'Int!',
  description:
    'Returns the number of alerts raised across all the queues associated with this host',
  async resolve(host: HostManager): Promise<number> {
    return RuleScripts.getHostAlertCount(host);
  },
};