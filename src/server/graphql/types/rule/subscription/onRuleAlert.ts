import { GraphQLFieldResolver } from 'graphql';
import { RuleAlert } from '../../../../../types';
import { FieldConfig, RuleAlertTC } from '../../index';
import { schemaComposer } from 'graphql-compose';
import { getRuleManager } from '../../../helpers';
import { createSubscriptionResolver } from '../../../helpers/subscriptionManager';

function getResolver(): GraphQLFieldResolver<any, any> {
  function channelName(_: unknown, { input }): string {
    const { queueId, ruleIds = [] } = input || {};
    let name = `RULE_ALERTS:${queueId}`;
    if (!ruleIds.length) {
      return name;
    }
    name = name + '_';
    if (ruleIds.length) {
      const ids = ruleIds.sort().join(',');
      name += ids;
    }
    return name;
  }

  function onSubscribe(_: unknown, { input }): AsyncIterator<RuleAlert> {
    const { queueId, ruleIds = [] } = input || {};
    const ruleManager = getRuleManager(queueId);

    return ruleManager.subscribeToAlerts({
      ruleIds,
    });
  }

  return createSubscriptionResolver({
    channelName,
    onSubscribe,
  });
}

export const onRuleAlert: FieldConfig = {
  type: schemaComposer.createObjectTC({
    name: 'OnRuleAlertPayload',
    fields: {
      alert: RuleAlertTC.NonNull,
    },
  }),
  args: {
    queueId: 'ID!',
    ruleIds: '[String!]',
  },
  subscribe: getResolver(),
};
