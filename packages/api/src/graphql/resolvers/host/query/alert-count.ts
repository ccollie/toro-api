import { HostManager, RuleScripts } from '@alpen/core';
import { FieldConfig } from '../../utils';

export const alertCount: FieldConfig = {
  type: 'Int!',
  description:
    'Returns the number of alerts raised across all the queues associated with this host',
  async resolve(host: HostManager): Promise<number> {
    return RuleScripts.getHostAlertCount(host);
  },
};
