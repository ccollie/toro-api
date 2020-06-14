import { createResolver } from '../../subscription';
import { GraphQLFieldResolver } from 'graphql';
import { getRuleManager } from '../helpers';
import { RuleAlert } from '../../../../../types';

export function ruleAlerts(): GraphQLFieldResolver<any, any> {
  function channelName(_, { input }): string {
    const { queueId, ruleIds = [], returnResetEvents } = input || {};
    let name = `RULE_ALERTS:${queueId}`;
    if (returnResetEvents && !ruleIds.length) {
      return name;
    }
    name = name + '_';
    if (ruleIds.length) {
      const ids = ruleIds.sort().join(',');
      name += ids;
    }
    return name;
  }

  function onSubscribe(_, { input }, context): AsyncIterator<RuleAlert> {
    const { queueId, ruleIds = [], returnResetEvents } = input || {};
    const ruleManager = getRuleManager(context, queueId);
    const eventNames = ['alert.triggered'];
    if (returnResetEvents) eventNames.push('alert.reset');

    return ruleManager.subscribeToAlerts({
      eventNames,
      ruleIds,
    });
  }

  return createResolver({
    channelName,
    onSubscribe,
  });
}

export const Subscription = {
  ruleAlerts: {
    subscribe: ruleAlerts(),
  },
};
